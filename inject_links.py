import os
import glob

frontend_dir = r"d:\apna\frontend"

print("Injecting CSS and JS links into HTML files...")
for filepath in glob.glob(os.path.join(frontend_dir, "*.html")):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject CSS before </head>
    if '<link rel="stylesheet" href="css/style.css">' not in content:
        content = content.replace("</head>", '    <link rel="stylesheet" href="css/style.css">\n</head>')
        
    # Inject JS before </body>
    if '<script src="js/main.js"></script>' not in content:
        content = content.replace("</body>", '    <script src="js/main.js"></script>\n</body>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done injecting.")
