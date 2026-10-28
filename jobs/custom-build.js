const fs = require('fs');
const file = './build/index.html';

fs.readFile(file, function (err, html) {
    if (!err) {
        const url = 'https://jadeallencook.github.io/Yogi-FM/build/';
        const path = '/Yogi-FM/build/';
        const href = `href="${path}`;
        const src = `src="${path}`;
        html = html.toString();
        while (html.indexOf(href) !== -1) {
            html = html.replace(href, `href="${url}`);
        }
        while (html.indexOf(src) !== -1) {
            html = html.replace(src, `src="${url}`);
        }
        fs.writeFile(file, html, err => {
            if (err) console.log(err);
            else console.log('Custom build options applied, ready to push!\n');
        });
    } else {
        console.log(err);
    }
});
