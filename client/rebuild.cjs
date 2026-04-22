const fs = require('fs');
const dump = fs.readFileSync('dump.jsx', 'utf-8').split('\n');

function sliceDump(startStr, endStr) {
    let start = dump.findIndex(l => l.includes(startStr));
    if (start === -1) return '';
    let end = start+1;
    while(end < dump.length && !dump[end].includes(endStr)) end++;
    return dump.slice(start, end).join('\n');
}

const header = sliceDump('<Box', '<Tabs');
const mealsList = dump.slice(75, 186).join('\n');
const buildMeal = dump.slice(293, 344).join('\n');
const deepAnalysis = dump.slice(344, 383).join('\n');
const rightMealBuilder = dump.slice(383, 532).join('\n');
const todayDetailsPart1 = sliceDump('<Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>Today\'s Overview</Typography>', '<span style={{ fontWeight: 400');
const macroSplit = dump.slice(222, 241).join('\n');
const notes = dump.slice(270, 285).join('\n');
const scanProduct = dump.slice(860, 1007).join('\n');
const summaryPeriod = dump.slice(764, 858).join('\n');
const weightForm = dump.slice(1013, 1058).join('\n');
const weightGraphic = dump.slice(1059, 1173).join('\n');
const insights = dump.slice(1229, 1258).join('\n');

const newTabs = `      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, color: '#6b7280' }, '& .Mui-selected': { color: '#171717 !important' }, '& .MuiTabs-indicator': { bgcolor: '#171717' } }}>
        <Tab label="Daily Log" />
        <Tab label="Summary & Trends" />
        <Tab label="AI Insights" />
      </Tabs>
`;

const tab0 = `      {activeTab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.25fr 1fr' }, gap: 3, alignItems: 'start' }}>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                 <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Log a Meal</Typography>
                 <Box>
                   <Button size="small" variant={inputMode === 'search' ? 'contained' : 'outlined'} onClick={() => setInputMode('search')} sx={{ textTransform: 'none', mr: 1, borderRadius: 20, bgcolor: inputMode === 'search' ? '#171717' : 'transparent', color: inputMode === 'search' ? '#fff' : '#171717', '&:hover':{bgcolor: inputMode === 'search'?'#000':'rgba(0,0,0,0.04)'}, borderColor: '#e5e7eb' }}>Search DB</Button>
                   <Button size="small" variant={inputMode === 'scan' ? 'contained' : 'outlined'} onClick={() => setInputMode('scan')} sx={{ textTransform: 'none', borderRadius: 20, bgcolor: inputMode === 'scan' ? '#171717' : 'transparent', color: inputMode === 'scan' ? '#fff' : '#171717', '&:hover':{bgcolor: inputMode === 'scan'?'#000':'rgba(0,0,0,0.04)'}, borderColor: '#e5e7eb' }}>Barcode / Camera</Button>
                 </Box>
              </Box>
              {inputMode === 'search' ? (
                // search meal
                <Box>
${buildMeal.replace("<Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>", "<Box>")}
              ) : (
                // scan product
                <Box>
${scanProduct.replace("<Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>", "<Box>")}
              )}
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #e5e7eb' }}>
                ${rightMealBuilder}
              </Box>
            </Box>
            
            ${mealsList}
            ${notes}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Button variant="contained" onClick={() => setWeightModalOpen(true)} fullWidth sx={{ textTransform: 'none', py: 1.5, fontSize: '1rem', fontWeight: 600, bgcolor: '#171717', '&:hover': { bgcolor: '#000'} }}>
              Log Body Weight
            </Button>
            
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
               <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>Today's Overview</Typography>
               <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Key Nutrients</Typography>
               ${macroSplit}
               <Accordion elevation={0} sx={{ mt: 2, '&:before': { display: 'none' }, border: '1px solid #e5e7eb', borderRadius: '8px !important' }}>
                  <AccordionSummary expandIcon={<div />}>
                     <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Detailed Micronutrients</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                     ${todayDetailsPart1.replace('<Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>Today\'s Overview</Typography>', '').replace('<Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Key Nutrients</Typography>', '')}
                  </AccordionDetails>
               </Accordion>
            </Box>
          </Box>
        </Box>
      )}`;

const tab1 = `      {activeTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Weight Trend</Typography>
            ${weightGraphic}
          </Box>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            ${summaryPeriod}
          </Box>
        </Box>
      )}`;

const tab2 = `      {activeTab === 2 && (
        <Box>
           ${insights}
        </Box>
      )}`;

const weightModal = `
      <Dialog open={weightModalOpen} onClose={() => setWeightModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Log Body Weight</DialogTitle>
        <DialogContent dividers>
           ${weightForm}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
           <Button onClick={() => setWeightModalOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
           <Button onClick={() => { saveWeight(); setWeightModalOpen(false); }} variant="contained" sx={{ bgcolor: '#171717', color: '#fff', '&:hover':{bgcolor:'#000'}, textTransform: 'none' }}>Save Weight</Button>
        </DialogActions>
      </Dialog>
`;

const renderBlock = header + '\n' + newTabs + '\n' + tab0 + '\n' + tab1 + '\n' + tab2 + '\n' + weightModal + '\n    </Box>\n  );\n}\n';
fs.writeFileSync('newRender.jsx', renderBlock);
