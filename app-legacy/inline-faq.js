const fs = require('fs');
const index = fs.readFileSync('index.html', 'utf8');
const faq = fs.readFileSync('components/landing/faq-section.html', 'utf8').trim();

const placeholder = /    <!-- FAQ Section \(loaded from component; accordion inited after load\) -->\s*<div id="faq-section-container"><\/div>/;
const inlined = '    <!-- FAQ Section (inlined so it works without fetch) -->\n    <div id="faq-section-container">' + faq + '</div>';

let out = index.replace(placeholder, inlined);
if (out === index) {
  console.error('Placeholder not found');
  process.exit(1);
}

const scriptPattern = /    <!-- FAQ Section -->\s*<script src="components\/landing\/faq-section\.js"><\/script>\s*<script>[\s\S]*?faq-section-container[\s\S]*?<\/script>/;
const newScript = `    <!-- FAQ Section -->
    <script src="components/landing/faq-section.js"></script>
    <script>
      (function () {
        var container = document.getElementById('faq-section-container');
        if (container && window.initFAQAccordion) window.initFAQAccordion(container);
      })();
    </script>`;

out = out.replace(scriptPattern, newScript);

fs.writeFileSync('index.html', out);
console.log('FAQ inlined successfully');
