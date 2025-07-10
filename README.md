# Installation of `uv` 

To install `uv` package, please follow this guide:

https://docs.astral.sh/uv/getting-started/installation/

## For macOS and Linux

Use curl to download the script and execute it with sh:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```
If your system doesn't have curl, you can use wget:

```bash
wget -qO- https://astral.sh/uv/install.sh | sh
```

## For windows

Use irm to download the script and execute it with iex:

```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

# Launch DashVolcano

To launch the app, you need first to create a virtual environment which will be used by `uv`.

You can create a virtual environment with python, like this:

```bash
python3 -m venv .venv
```

Once created, you can activate it using this command:

```bash
source .venv/bin/activate
```

Then to import all the needed dependencies, you can run this line:
```bash
uv sync
```

Finally to launch the application, run this line:
``` bash
panel serve app.py --dev
```

# Access to MongoDB

Access to the MongoDB database is required for the application to function properly.

To ensure security, you must use authorized credentials. If you need access, please request the necessary credentials.