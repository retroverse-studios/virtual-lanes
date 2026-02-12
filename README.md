# VirtualLanes: Ten-Pin Bowling Simulation

<!-- BADGES:START -->
[![cli-tool](https://img.shields.io/badge/-cli--tool-blue?style=flat-square)](https://github.com/topics/cli-tool) [![data-persistence](https://img.shields.io/badge/-data--persistence-blue?style=flat-square)](https://github.com/topics/data-persistence) [![database](https://img.shields.io/badge/-database-blue?style=flat-square)](https://github.com/topics/database) [![documentation](https://img.shields.io/badge/-documentation-blue?style=flat-square)](https://github.com/topics/documentation) [![python](https://img.shields.io/badge/-python-3776ab?style=flat-square)](https://github.com/topics/python) [![simulation](https://img.shields.io/badge/-simulation-blue?style=flat-square)](https://github.com/topics/simulation) [![sports-analytics](https://img.shields.io/badge/-sports--analytics-blue?style=flat-square)](https://github.com/topics/sports-analytics) [![ten-pin-bowling](https://img.shields.io/badge/-ten--pin--bowling-blue?style=flat-square)](https://github.com/topics/ten-pin-bowling) [![tui](https://img.shields.io/badge/-tui-blue?style=flat-square)](https://github.com/topics/tui) [![web-app](https://img.shields.io/badge/-web--app-blue?style=flat-square)](https://github.com/topics/web-app)
<!-- BADGES:END -->

VirtualLanes is an extensive simulation toolkit designed for modeling ten-pin bowling games. It offers a comprehensive suite of classes that simulate games, tournaments, leagues, and more, providing a realistic and detailed representation of bowling dynamics. The project also includes a scoring system compatible with various bowling rules, a database for persisting game results, and multiple interfaces (CLI, TUI, Web) for interacting with the library.

## Features

- **Simulation Classes**: Simulate bowling games frame by frame or as complete games using different probabilities for strikes, spares, and opens.
- **Scoring Systems**: Includes traditional, current frame, and 9-pin no-tap scoring systems.
- **Bowling Database**: A SQLite database integration for storing and managing bowling games, bowlers, alleys, and tournaments.
- **League and Tournament Support**: Organize and run bowling tournaments and leagues with multiple games and multiple bowlers, customizable for different team sizes and frequencies.
- **Multiple Interfaces**:
  - **Command Line Interface (CLI)**: Using Typer for a rich command-line experience
  - **Terminal User Interface (TUI)**: Using Textual for an interactive terminal application
  - **Web Interface**: Using FastHTML for a modern, responsive web application
- **Documentation**: Auto-generated API documentation using MkDocs for easy reference and usage.

## Installation

### Using pip

```bash
pip install virtual-lanes
```

### From source

Clone the repository and install using pip or uv:

```bash
git clone https://github.com/michael-borck/virtual-lanes.git
cd virtual-lanes

# Using pip
pip install -e .

# Or using uv (recommended)
uv pip install -e .
```

## Usage

### As a Python Library

```python
from virtual_lanes import Bowler, Game, Scoring

# Create a bowler
player = Bowler("John Doe", 180)

# Create a game
game = Game(player)
game.roll(10)  # Strike
game.roll(5)   # 5 pins
game.roll(5)   # Spare

# Get the score
score = Scoring.calculate_score(game)
print(f"{player.name}'s score: {score}")
```

### Command Line Interface (CLI)

VirtualLanes provides a command-line interface with various subcommands:

```bash
# Show CLI help
virtual-lanes --help

# Manage bowlers
virtual-lanes bowlers list
virtual-lanes bowlers add "John Doe" 180

# Manage games
virtual-lanes games list
virtual-lanes games add "John Doe" 210

# Start the Terminal UI
virtual-lanes tui start

# Start the Web Interface
virtual-lanes web start
```

### Terminal User Interface (TUI)

Start the interactive terminal interface:

```bash
virtual-lanes tui start
```

Or from Python:

```python
import virtual_lanes
virtual_lanes.run_tui()
```

### Web Interface

Start the web server:

```bash
virtual-lanes web start --host 0.0.0.0 --port 8080
```

Or from Python:

```python
import virtual_lanes
virtual_lanes.run_web(host="0.0.0.0", port=8080, debug=True)
```

Then open your browser at `http://localhost:8080`.

## Documentation

Generate and view the documentation locally:

```bash
# Install development dependencies
uv pip install "virtual-lanes[dev]"
# or using pip
pip install "virtual-lanes[dev]"

# Serve the documentation
mkdocs serve
```

## Development Setup

For a quick development setup with uv, run:

```bash
./setup_uv.sh
```

This will:
1. Install uv if needed
2. Create a virtual environment
3. Install all dependencies
4. Show usage instructions

## Testing, Linting and Type Checking

Run tests using pytest:

```bash
pytest
```

Run linting with ruff:

```bash
ruff check src tests
```

Run type checking with mypy:

```bash
mypy src tests
```

## Contributing

Contributions are welcome! Please read the [contributing guide](docs/contribute.md) for directions on how to submit pull requests to the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.