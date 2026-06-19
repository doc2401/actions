#!/bin/bash
set -e

# Configuration
CONFIG_PATH=${1:-"lang.json"}
BASE_URL=${BASE_URL:-""}
GENERATE_SITEMAP=${GENERATE_SITEMAP:-true}

echo "=================================================="
echo "Language Deployment Script"
echo "=================================================="
echo "Config Path:      $CONFIG_PATH"
echo "Base URL:         $BASE_URL"
echo "Generate Sitemap: $GENERATE_SITEMAP"
echo "=================================================="

if [ ! -f "$CONFIG_PATH" ]; then
    echo "Error: Configuration file '$CONFIG_PATH' not found."
    exit 1
fi

# 1. Build localized pages
echo "Building localized pages..."
mkdir -p _public

jq -c '.pages[]' "$CONFIG_PATH" | while read -r item; do
    url=$(echo "$item" | jq -r '.url')
    clean_url="${url%/}"
    
    echo "Processing URL directory: $clean_url"
    mkdir -p "_public/$clean_url"
    
    # Iterate through the path array
    echo "$item" | jq -r '.path[]' | while read -r src_path; do
        clean_path="${src_path%/}"
        if [ -d "$clean_path" ]; then
            echo "  -> Copying $clean_path/* to _public/$clean_url/"
            cp -a "$clean_path"/. "_public/$clean_url"/
        else
            echo "  -> Warning: Source path $clean_path not found!"
        fi
    done
done

# 2. Generate sitemap.xml
if [ "$GENERATE_SITEMAP" == "true" ]; then
    echo "Generating sitemaps..."
    
    # Remove trailing slash from base_url for consistency
    BASE_URL="${BASE_URL%/}"
    
    INDEX_FILE="_public/sitemap.xml"
    echo '<?xml version="1.0" encoding="UTF-8"?>' > "$INDEX_FILE"
    echo '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> "$INDEX_FILE"
    
    jq -r '.pages[].url' "$CONFIG_PATH" | while read -r url; do
        clean_url="${url%/}"
        [ -z "$clean_url" ] && continue
        
        SITEMAP_REL_PATH="${clean_url}/sitemap.xml"
        SITEMAP_FILE="_public/${SITEMAP_REL_PATH}"
        
        echo "Generating sub-sitemap: $SITEMAP_REL_PATH"
        echo '<?xml version="1.0" encoding="UTF-8"?>' > "$SITEMAP_FILE"
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> "$SITEMAP_FILE"
        
        count=0
        # Search for HTML files in the public directory for this language
        if [ -d "_public/$clean_url" ]; then
            while read -r file; do
                rel_path="${file#_public/}"
                echo "  <url>" >> "$SITEMAP_FILE"
                echo "    <loc>${BASE_URL}/${rel_path}</loc>" >> "$SITEMAP_FILE"
                echo "    <lastmod>$(date -I)</lastmod>" >> "$SITEMAP_FILE"
                echo "  </url>" >> "$SITEMAP_FILE"
                count=$((count + 1))
            done < <(find "_public/$clean_url" -type f -name "*.html")
        fi
        
        echo "</urlset>" >> "$SITEMAP_FILE"
        echo "  -> Added $count URLs to $SITEMAP_REL_PATH"
        
        # Add this sub-sitemap to the index
        echo "  <sitemap>" >> "$INDEX_FILE"
        echo "    <loc>${BASE_URL}/${SITEMAP_REL_PATH}</loc>" >> "$INDEX_FILE"
        echo "    <lastmod>$(date -I)</lastmod>" >> "$INDEX_FILE"
        echo "  </sitemap>" >> "$INDEX_FILE"
    done
    
    echo "</sitemapindex>" >> "$INDEX_FILE"
    echo "Sitemap Index created at $INDEX_FILE"
fi

echo "=================================================="
echo "Done!"
echo "=================================================="
