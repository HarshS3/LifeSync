const fs = require('fs');
const path = require('path');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const componentsDir = path.resolve('src/components');
const allFiles = findFiles(componentsDir);

let count = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace quoted hex colors with theme strings, ignoring if they're used as variables
  content = content.replace(/'#fff'/g, "'background.paper'");
  content = content.replace(/"#fff"/g, "'background.paper'");
  content = content.replace(/'#ffffff'/g, "'background.paper'");
  content = content.replace(/"#ffffff"/g, "'background.paper'");
  
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

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
});

console.log(`Updated ${count} files.`);
