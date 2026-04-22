const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/NutritionTracker.jsx');
const text = fs.readFileSync(filePath + '.bak', 'utf8');
const lines = text.split(/\r?\n/);

const getChunk = (startLine, endLine) => lines.slice(startLine, endLine - 1);

const tab0Content = getChunk(1528, 1726); 
const tab1Content = getChunk(1729, 1965); 
const tab3Content = getChunk(1967, 2197); 
const tab4Content = getChunk(2199, 2292); 
const tab5Content = getChunk(2294, 2444); 
const tab2Content = getChunk(2446, 2609); 
const tab6Content = getChunk(2611, 2615); 

// Find where weight loading starts so we can split input and graph
const idxChartStart = tab2Content.findIndex(l => l.includes('{weightLoading ? (')) - 1;
const weightInputContent = tab2Content.slice(0, idxChartStart); // Starts with <Box>
const weightGraphContent = tab2Content.slice(idxChartStart); // Ends with </Box>

// We remove the default open from these sections to ensure they collapse
const newTab0 = [
  '      {activeTab === 0 && (',
  '        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>',
  ...tab0Content,
  '          <Box sx={{ bgcolor: "#fff", borderRadius: 2, border: "1px solid #e5e7eb" }}>',
  '            <ExpandableSection title="Log Meal" defaultOpen={false}>',
  ...tab1Content,
  '            </ExpandableSection>',
  '          </Box>',
  '          <Box sx={{ bgcolor: "#fff", borderRadius: 2, border: "1px solid #e5e7eb" }}>',
  '            <ExpandableSection title="Scan Product Barcode" defaultOpen={false}>',
  ...tab5Content,
  '            </ExpandableSection>',
  '          </Box>',
  '          <Box sx={{ bgcolor: "#fff", borderRadius: 2, border: "1px solid #e5e7eb" }}>',
  '            <ExpandableSection title="Update Weight" defaultOpen={false}>',
  ...weightInputContent.slice(1), // Remove its own outer Box sx={p:3} wrappers so it sits inside ExpandableSection
  '            </ExpandableSection>',
  '          </Box>',
  '        </Box>',
  '      )}'
];

const newTab1 = [
  '      {activeTab === 1 && (',
  ...tab3Content,
  '      )}'
];

const newTab2Refined = [
  '      {activeTab === 2 && (',
  '        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>',
  ...tab4Content,
  '          <Box sx={{ p: 3, bgcolor: "#fff", borderRadius: 2, border: "1px solid #e5e7eb" }}>',
  '            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Weight Trend</Typography>',
  ...weightGraphContent,
  '        </Box>',
  '      )}'
];

const newTab3 = [
  '      {activeTab === 3 && (',
  ...tab6Content,
  '      )}'
];

const prefix = lines.slice(0, 1527);
const suffix = lines.slice(2615);

const newLines = [
  ...prefix,
  ...newTab0,
  ...newTab1,
  ...newTab2Refined,
  ...newTab3,
  ...suffix
];

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Rebuild complete! 🎉');
