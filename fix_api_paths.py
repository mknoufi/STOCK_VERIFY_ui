import re

file_path = 'frontend/src/services/api/api.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Patterns to replace
# api.get('/...
# api.post('/...
# api.put('/...
# api.delete('/...
# api.patch('/...
# And with backticks `

def replace_path(match):
    method = match.group(1)
    quote = match.group(2)
    path = match.group(3)

    if path.startswith('api/'):
        return f"api.{method}({quote}/{path}"

    return f"api.{method}({quote}/api/{path}"

# Regex to find api calls
# api\.(get|post|put|delete|patch)\((['`"])\/([^'`"]+)
pattern = re.compile(r"api\.(get|post|put|delete|patch)\((['`\"])\/([^'`\"]+)")

new_content = pattern.sub(replace_path, content)

with open(file_path, 'w') as f:
    f.write(new_content)

print("Done")
