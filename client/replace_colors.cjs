const fs = require('fs');

const files = [
  'd:/Projects/LifeSync/client/src/components/HabitTracker.jsx',
  'd:/Projects/LifeSync/client/src/components/ProfilePanel.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/'#fff'/g, "'background.paper'");
  content = content.replace(/"#fff"/g, "'background.paper'");
  
  content = content.replace(/'#e5e7eb'/g, "'divider'");
  content = content.replace(/"#e5e7eb"/g, "'divider'");
  
  content = content.replace(/'#171717'/g, "'text.primary'");
  content = content.replace(/"#171717"/g, "'text.primary'");
  
  content = content.replace(/'#6b7280'/g, "'text.secondary'");
  content = content.replace(/"#6b7280"/g, "'text.secondary'");
  
  content = content.replace(/'#374151'/g, "'text.secondary'");
  content = content.replace(/"#374151"/g, "'text.secondary'");

  content = content.replace(/'#f8fafc'/g, "'background.default'");
  content = content.replace(/"#f8fafc"/g, "'background.default'");

  content = content.replace(/'#f9fafb'/g, "'action.hover'");
  content = content.replace(/"#f9fafb"/g, "'action.hover'");

  content = content.replace(/'#f3f4f6'/g, "'action.selected'");
  content = content.replace(/"#f3f4f6"/g, "'action.selected'");

  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed ' + file);
});
