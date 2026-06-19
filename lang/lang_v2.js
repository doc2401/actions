const fs = require('fs');
const path = require('path');

// Configuration
const configPath = process.argv[2] || "lang.json";

if (!fs.existsSync(configPath)) {
    console.error(`Error: Configuration file '${configPath}' not found.`);
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Resolve base_url: Env var > JSON config > empty string
const envBaseUrl = process.env.BASE_URL;
const settings = config.settings || {};
const baseUrlRaw = (envBaseUrl !== undefined && envBaseUrl.trim() !== "") ? envBaseUrl : (settings.base_url || "");
const baseUrl = baseUrlRaw.replace(/\/+$/, '');

// Resolve generate_sitemap: Env var > JSON config > true
const envSitemap = process.env.GENERATE_SITEMAP;
let generateSitemap = true;
if (settings.generate_sitemap !== undefined) {
    generateSitemap = settings.generate_sitemap === true || settings.generate_sitemap === "true";
}
if (envSitemap !== undefined && envSitemap.trim() !== "") {
    generateSitemap = envSitemap === "true";
}

// Resolve publish_branch: Env var > JSON config > empty string
const envPublishBranch = process.env.PUBLISH_BRANCH;
const publishBranch = (envPublishBranch !== undefined && envPublishBranch.trim() !== "") ? envPublishBranch : (settings.publish_branch || "");

if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `publish_branch=${publishBranch}\n`);
}

console.log("==================================================");
console.log("Language Deployment Script (Node.js)");
console.log("==================================================");
console.log(`Config Path:      ${configPath}`);
console.log(`Base URL:         ${baseUrl}`);
console.log(`Generate Sitemap: ${generateSitemap}`);
console.log(`Publish Branch:   ${publishBranch || '(None)'}`);
console.log("==================================================");
// 1. Build localized pages
console.log("Building localized pages...");
const publicDir = '_public';
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

console.log(`  -> Copying config file ${configPath} to ${publicDir}/`);
fs.copyFileSync(configPath, path.join(publicDir, path.basename(configPath)));

config.pages.forEach(item => {
    const cleanUrl = item.url.replace(/\/+$/, '');
    const targetDir = path.join(publicDir, cleanUrl);
    
    console.log(`Processing URL directory: ${cleanUrl}`);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    item.path.forEach(srcPath => {
        const cleanPath = srcPath.replace(/\/+$/, '');
        if (fs.existsSync(cleanPath) && fs.statSync(cleanPath).isDirectory()) {
            console.log(`  -> Copying ${cleanPath}/* to ${targetDir.replace(/\\/g, '/')}/`);
            // Uses Node.js built-in cpSync (available in Node 16.7.0+)
            fs.cpSync(cleanPath, targetDir, { recursive: true, force: true });
        } else {
            console.log(`  -> Warning: Source path ${cleanPath} not found or is not a directory!`);
        }
    });
});

// Helper function to find HTML files recursively
function findHtmlFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// 2. Generate sitemap.xml
if (generateSitemap) {
    console.log("Generating sitemaps...");
    
    const indexFile = path.join(publicDir, 'sitemap.xml');
    let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    indexXml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    config.pages.forEach(item => {
        const cleanUrl = item.url.replace(/\/+$/, '');
        if (!cleanUrl && item.url !== "/") return;
        
        const targetDir = path.join(publicDir, cleanUrl);
        if (!fs.existsSync(targetDir)) return;
        
        const pageSplits = item.sitemap_split !== undefined ? item.sitemap_split : settings.sitemap_split;
        const splits = Array.isArray(pageSplits) ? pageSplits.map(s => s.replace(/^\/+|\/+$/g, '')) : [];
        // Sort by length descending to match deepest paths first
        splits.sort((a, b) => b.length - a.length);
        
        const groups = { main: [] };
        splits.forEach(s => groups[s] = []);
        
        const htmlFiles = findHtmlFiles(targetDir);
        htmlFiles.forEach(file => {
            let relToPage = path.relative(targetDir, file).replace(/\\/g, '/');
            let matchedSplit = null;
            for (let s of splits) {
                if (relToPage.startsWith(s + '/')) {
                    matchedSplit = s;
                    break;
                }
            }
            if (matchedSplit) {
                groups[matchedSplit].push(file);
            } else {
                groups.main.push(file);
            }
        });
        
        for (const [groupName, files] of Object.entries(groups)) {
            // Skip empty sub-sitemaps
            if (files.length === 0 && groupName !== 'main') continue;
            
            const subName = groupName === 'main' ? 'sitemap.xml' : `sitemap_${groupName.replace(/\//g, '_')}.xml`;
            const sitemapRelPath = cleanUrl ? `${cleanUrl}/${subName}` : subName;
            const sitemapFile = path.join(publicDir, sitemapRelPath);
            
            console.log(`Generating sub-sitemap: ${sitemapRelPath}`);
            let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
            
            let count = 0;
            files.forEach(file => {
                let relPath = path.relative(publicDir, file).replace(/\\/g, '/');
                sitemapXml += `  <url>\n`;
                sitemapXml += `    <loc>${baseUrl}/${relPath}</loc>\n`;
                sitemapXml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
                sitemapXml += `  </url>\n`;
                count++;
            });
            
            sitemapXml += '</urlset>\n';
            fs.writeFileSync(sitemapFile, sitemapXml);
            console.log(`  -> Added ${count} URLs to ${sitemapRelPath}`);
            
            indexXml += `  <sitemap>\n`;
            indexXml += `    <loc>${baseUrl}/${sitemapRelPath}</loc>\n`;
            indexXml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
            indexXml += `  </sitemap>\n`;
        }
    });
    
    indexXml += '</sitemapindex>\n';
    fs.writeFileSync(indexFile, indexXml);
    console.log(`Sitemap Index created at ${indexFile}`);
}

console.log("==================================================");
console.log("Done!");
console.log("==================================================");
