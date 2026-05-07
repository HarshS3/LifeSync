const fs = require('fs');
const content = fs.readFileSync('client/src/components/NutritionTracker.jsx', 'utf8');
const lines = content.split('\n');

const extractBlock = (startText, endText, nextText) => {
  let startIdx = lines.findIndex(l => l.includes(startText));
  if (startIdx === -1) throw new Error('Could not find ' + startText);
  let endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(endText) && lines[i+1]?.includes(nextText));
  if (endIdx === -1) throw new Error('Could not find end for ' + startText);
  
  const extracted = lines.slice(startIdx, endIdx + 1).join('\n');
  const remainingLines = [
    ...lines.slice(0, startIdx),
    '      <TAB_REPLACEMENT>',
    ...lines.slice(endIdx + 1)
  ];
  return { extracted, remainingLines };
};

console.log('Testing extraction logic...');
try {
  let { extracted, remainingLines } = extractBlock('{activeTab === 0 && (', ')}', '{/* â”€â”€â”€ TAB 1');
  console.log('Tab 0 block length:', extracted.split('\n').length);
} catch(e) {
  console.error(e);
}
