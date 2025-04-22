const fs = require('fs-extra')
const path = require('path')
const handlebars = require('handlebars')

console.log('Building...')

const viewsDir = path.join(__dirname, '../src/views/')
const buildDir = path.join(__dirname, '../build')
const pagesDir = path.join(viewsDir, 'pages')
const partialsDir = path.join(viewsDir, 'partials')
const scriptsSrcDir = path.join(__dirname, '../src/scripts')
const scriptsDestDir = path.join(buildDir, 'scripts')

fs.emptyDirSync(buildDir)
fs.copySync(scriptsSrcDir, scriptsDestDir)

// Допрацювати функцію extractScripts такий чином щоб вона повертала всі співпадіння для скриптів
// А не тільки перше як в прикладі нижче
// console.log(extractScripts('{{!-- scripts: ["scripts/script.js"] --}} {{!-- scripts: ["scripts/scriptsdfsdf.js"] --}}\n' +
//     '<!doctype html>\n' +
//     '<html lang="en">'))

const extractScripts = (templateContent) => {
    const match = templateContent.match(/{{!--\s*scripts:\s*(\[.*?\])\s*--}}/s);
    if(match){
        try{
            return JSON.parse(match[1])
        }catch (err){
            console.log("❌ Error", err)
        }
    }
    return [];
}

const mainTemplateSource = fs.readFileSync(
    path.join(viewsDir, 'layouts/main.hbs'),
    'utf8'
)
const mainTemplate = handlebars.compile(mainTemplateSource)

// Зробити цю частинку скрипта більш універсалізованою в плані того щоб partial можна було розкидати по директоріях
// Фактично в readdirSync має викликатись рекурсивно ще один readdirSync якщо ми зіткнулись з директорією а не файлом
// Можна реалізувати до 2 рівня вловності папок
fs.readdirSync(partialsDir).forEach(file => {
    const filePath = path.join(partialsDir, file);
    const partialName = path.basename(file, '.hbs');
    const partialContent = fs.readFileSync(filePath, 'utf8');
    handlebars.registerPartial(partialName, partialContent);
})

// Зробити цю частинку скрипта більш універсалізованою в плані того щоб pages можна було розкидати по директоріях
// Фактично в readdirSync має викликатись рекурсивно ще один readdirSync якщо ми зіткнулись з директорією а не файлом
// Можна реалізувати до 2 рівня вловності папок
fs.readdirSync(pagesDir).forEach(file => {
    const pageName = path.basename(file, '.hbs');
    const filePath = path.join(pagesDir, file);
    const pageContent = fs.readFileSync(filePath, 'utf8');
    const pageTemplate = handlebars.compile(pageContent);

    let scripts = extractScripts(pageContent);
    console.log(pageName)
    // пошук скриптів в partials
    fs.readdirSync(partialsDir).forEach(partialsFile => {
        const partialContent = fs.readFileSync(path.join(partialsDir, partialsFile), 'utf8');
        const partialName = path.basename(partialsFile, '.hbs');
        const usedInPage = pageContent.includes(`{{> ${partialName}}`);
        if(usedInPage){
            //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat
            const partialScript = extractScripts(partialContent)
            scripts = scripts.concat(partialScript)
        }
    })

    // Видалення дублікатів за рахунок того що scripts ініціалізовується в SET()
    scripts = [...new Set(scripts)];
    console.log(scripts)

    // Рендер фінальної сторінки
    const finalHtml = mainTemplate({
        title: pageName,
        body: pageTemplate({}),
        scripts
    })

    fs.writeFileSync(path.join(buildDir, `${pageName}.html`), finalHtml);

})

console.log('✅ Built')


