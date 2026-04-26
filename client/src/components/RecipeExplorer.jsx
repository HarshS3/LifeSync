import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fade
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import InfoIcon from '@mui/icons-material/Info';
import { API_BASE } from '../config';

const RecipeExplorer = ({ token }) => {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fetch suggestions
  useEffect(() => {
    let active = true;

    if (inputValue.length < 3) {
      setOptions([]);
      return undefined;
    }

    setLoading(true);

    fetch(`${API_BASE}/api/recipes/search?q=${encodeURIComponent(inputValue)}&limit=15`)
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setOptions(data || []);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [inputValue]);

  const handleSelect = async (event, value) => {
    if (!value) {
      setSelectedRecipe(null);
      return;
    }

    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/recipes/details?url=${encodeURIComponent(value.recipe_url)}`);
      const data = await res.json();
      setSelectedRecipe(data);
    } catch (err) {
      console.error('Failed to fetch recipe details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getIngredientsBySection = () => {
    if (!selectedRecipe?.ingredients) return {};
    const sections = {};
    selectedRecipe.ingredients.forEach(ing => {
      const section = ing.section || 'Main Ingredients';
      if (!sections[section]) sections[section] = [];
      sections[section].push(ing);
    });
    return sections;
  };

  const ingredientsBySection = getIngredientsBySection();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <RestaurantIcon color="primary" />
        Tarla Dalal Recipe Explorer
      </Typography>

      <Autocomplete
        id="recipe-search"
        sx={{ mb: 4 }}
        openOnFocus
        getOptionLabel={(option) => typeof option === 'string' ? option : option.food_name}
        options={options}
        loading={loading}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        onChange={handleSelect}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Indian Recipes (e.g. Paneer, Dosa, Khichdi)"
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...optionProps } = props;
          return (
            <li key={key} {...optionProps}>
              <Box>
                <Typography variant="body1">{option.food_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.recipe_title}
                </Typography>
              </Box>
            </li>
          );
        }}
      />

      {detailsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {selectedRecipe && !detailsLoading && (
        <Fade in={!!selectedRecipe}>
          <Box>
            <Card variant="outlined" sx={{ mb: 4, borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Box sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{selectedRecipe.food_name}</Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {selectedRecipe.recipe_title}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  <Chip 
                    icon={<LocalDiningIcon />} 
                    label={`Yield: ${selectedRecipe.serving_label || '1 portion'}`} 
                    variant="outlined" 
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip 
                    label={`${selectedRecipe.ingredient_count || 0} Ingredients`} 
                    variant="outlined"
                  />
                  {selectedRecipe.energy_value && (
                    <Chip 
                      label={`${selectedRecipe.energy_value} per serving`} 
                      color="success" 
                      variant="filled"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Box>
              </Box>

              <Divider />

              <CardContent sx={{ p: 0 }}>
                <Grid container>
                  {/* Left Column: Ingredients */}
                  <Grid item xs={12} md={7} sx={{ p: 3, borderRight: { md: '1px solid rgba(0,0,0,0.08)' } }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RestaurantIcon fontSize="small" /> Ingredients
                    </Typography>
                    
                    {Object.keys(ingredientsBySection).length === 0 ? (
                      <Typography color="text.secondary">No ingredients data available for this recipe.</Typography>
                    ) : (
                      Object.entries(ingredientsBySection).map(([section, ings]) => (
                        <Box key={section} sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 1, letterSpacing: 1 }}>
                            {section}
                          </Typography>
                          <List dense disablePadding>
                            {ings.map((ing, idx) => (
                              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                                <ListItemText 
                                  primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {ing.ingredient_name || ing.ingredient_text}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {ing.amount_text}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      ))
                    )}
                  </Grid>

                  {/* Right Column: Nutrients */}
                  <Grid item xs={12} md={5} sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.01)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon fontSize="small" /> Nutritional Info
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      {selectedRecipe.nutrient_heading || 'Values per serving'}
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableBody>
                          {[
                            { label: 'Energy', value: selectedRecipe.energy_value, key: 'energy_value' },
                            { label: 'Protein', value: selectedRecipe.protein_value, key: 'protein_value' },
                            { label: 'Carbs', value: selectedRecipe.carbohydrates_value, key: 'carbohydrates_value' },
                            { label: 'Fat', value: selectedRecipe.fat_value, key: 'fat_value' },
                            { label: 'Fiber', value: selectedRecipe.fiber_value, key: 'fiber_value' },
                            { label: 'Sodium', value: selectedRecipe.sodium_value, key: 'sodium_value' },
                            { label: 'Cholesterol', value: selectedRecipe.cholesterol_value, key: 'cholesterol_value' }
                          ].map((row) => (
                            <TableRow key={row.key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                              <TableCell align="right">{row.value || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText', display: 'none' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Smart Tip:
                      </Typography>
                      <Typography variant="caption">
                        Combine this with high-fiber grains for a lower glycemic response.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="caption" color="text.secondary">
                Data provided by TarlaDalal.com. All recipes are Indian vegetarian.
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default RecipeExplorer;
