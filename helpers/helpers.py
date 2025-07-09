import re
import ast
import json
import pandas as pd
import geopandas as gpd
import warnings

from cftime import datetime, CFWarning
from datetime import timedelta
from shapely.geometry import MultiLineString, LineString

from constants.paths import TECTONICS_PLATES_DIR
from constants.rocks import GEOROC_TO_GVP, MAIN_ROCK_COLORS, ROCK_GVP

warnings.filterwarnings("ignore", category=CFWarning)

def timedelta_to_human_readable(uncertainty_days):
    """Convert timedelta to a human-readable ±X [years, months, days] string."""

    if uncertainty_days == 0:
        return "(uncertainty 0 days)"
    years, rem = divmod(uncertainty_days, 365)
    months, days = divmod(rem, 30)

    parts = [
        f"{years} year{'s' if years > 1 else ''}" if years else "",
        f"{months} month{'s' if months > 1 else ''}" if months else "",
        f"{days} day{'s' if days > 0 else ''}" if days else "",
    ]
    return "(uncertainty ±" + " ".join(p for p in parts if p) + ")"

def compute_date_info(y, m, d, uncertainty_days):
    try:
        y = int(y)
        m = int(m) if pd.notnull(m) else 6
        d = int(d) if pd.notnull(d) else 15
        uncertainty_days = timedelta(days=uncertainty_days) if pd.notnull(uncertainty_days) else None
        
        date = datetime(y, m, d)
        return date, date - uncertainty_days, date + uncertainty_days
    except Exception:
        return None, None, None, None

# --- Compute end datetime + uncertainty interval ---
def compute_end(row):
    if pd.notnull(row['end_year']) and int(row['end_year']) != 0:
        return pd.Series(compute_date_info(row['end_year'], row['end_month'], row['end_day'], row['end_uncertainty_days']))
        
    else:
        # fallback: use start_max (start + delta)
        return pd.Series((row['start_datetime'], row['start_min'], row['start_max']))

def format_date_uncertainty(date, uncertainty_days):
    if pd.isnull(date) or pd.isna(uncertainty_days):
        return "Unknown"

    delta_days = timedelta(days=uncertainty_days).days

    if delta_days > 180:
        # Only year known
        date_str = f"{date.year}"
    elif delta_days > 30:
        # Only year and month known
        date_str = f"{date.year}-{date.month:02d}"
    else:
        # Full date known
        date_str = f"{date.year}-{date.month:02d}-{date.day:02d}"

    return f"{date_str} {timedelta_to_human_readable(delta_days)}"


def safe_parse_events(x):
    def summarize(events):
        text = ', '.join(str(event) for event in events)
        return text[:40] + '...' if len(text) > 40 else text

    if isinstance(x, list):
        return 'No events' if not x else summarize(x)
    elif isinstance(x, str) and x.strip() != "":
        try:
            events_list = ast.literal_eval(x)
            return summarize(events_list)
        except Exception:
            return ''
    else:
        return ''

def extract_volcano_number(volcano_str):
    """Extract the volcano number from a string in the format 'Volcano Name (volcano_number)'."""
    if not volcano_str:
        return None
    # Split the string to extract the part inside the parentheses
    return int(volcano_str.split('(')[1].split(')')[0])

def extract_eruption_number(eruption_str):
    """Extract the eruption number from a string in the format 'YYYY-MM-DD (eruption_number)'."""
    if not eruption_str:
        return None
    # Split the string to extract the part inside the parentheses
    return int(eruption_str.split('(')[1].split(')')[0])

# Function to format the date dictionary into a string
def format_date(date_dict, eruption_number=None):
    if not date_dict:
        return "Unknown Date"

    year = date_dict.get('year', 'Unknown Year')
    month = date_dict.get('month')
    day = date_dict.get('day')

    if (month == 'Unknown Month' or month == 0 or month is None or
        day == 'Unknown Day' or day == 0 or day is None):
        era = "BCE" if year < 0 else "CE"
        date_str = f"{year} {era}"
    else:
        date_str = f"{year}-{month:02d}-{day:02d}"

    if eruption_number is not None:
        return f"{date_str} ({eruption_number})"
    else:
        return date_str


def parse_formatted_date(date_str):
    """
    Inverse of format_date: parses a formatted date string back into a dictionary.
    Handles both 'YYYY-MM-DD', 'YYYY CE/BCE', and optional '(eruption_number)'.
    """
    result = {}
    eruption_number = None

    # Extract eruption number if present
    match = re.match(r"(.+?)\s*\((\d+)\)$", date_str)
    if match:
        date_str, eruption_number = match.group(1).strip(), int(match.group(2))

    # Handle BCE/CE
    if "BCE" in date_str or "CE" in date_str:
        parts = date_str.split()
        try:
            year = int(parts[0])
        except Exception:
            year = 'Unknown Year'
        result = {'year': year, 'month': 0, 'day': 0}
    # Handle YYYY-MM-DD
    elif "-" in date_str:
        try:
            year, month, day = date_str.split("-")
            result = {'year': int(year), 'month': int(month), 'day': int(day)}
        except Exception:
            result = {'year': 0, 'month': 0, 'day': 0}
    else:
        result = {'year': 0, 'month': 0, 'day': 0}

    if eruption_number is not None:
        return result, eruption_number
    else:
        return result
    

def get_discrete_color_map_samples():
    """    
    Generates a dictionary mapping rock names to their corresponding RGB color codes.
    """

    return {
        name: 'rgb' + str(rocks_to_color(name)) for name in GEOROC_TO_GVP.keys()
    }


def get_discrete_color_map_volcanoes():
    """    
    Generates a dictionary mapping rock names to their corresponding RGB color codes.
    """

    return {
        name: 'rgb' + str(rocks_to_color(name)) for name in ROCK_GVP
    }


def rocks_to_color(rock_name):
    """
    Maps a rock name to its corresponding color. Main rocks are assigned specific colors,
    while all others default to black.

    Args:
        rock_name (str): The name of the rock.

    Returns:
        tuple: A corresponding RGB color code.
    """
    # Get the simplified rock name
    short_name = GEOROC_TO_GVP.get(rock_name.upper(), None)
    if short_name:
        return MAIN_ROCK_COLORS.get(short_name, (0, 0, 0))  # Default to black if not in main rocks
    return (0, 0, 0)  # Default to black if rock name is invalid


def create_menu_options(items, disabled_state=None):
    """
    Creates a list of dictionary-based menu options for a dropdown or menu component.
    
    Args:
        items (list): A list of items for which menu options need to be created.
        disabled_state (dict, optional): A dictionary specifying the disabled state for each item.
                                         If None, all items will be enabled by default.

    Returns:
        list: A list of dictionaries, each containing 'label', 'disabled', and 'value' keys for the menu option.
    """

    # If no disabled_state is provided, initialize all items as enabled (False).
    if disabled_state is None:
        disabled_state = {item: False for item in items}

    # Create a list of menu options where each option is a dictionary containing:
    # 'label': the item name to display
    # 'disabled': whether the item is disabled (based on the disabled_state)
    # 'value': the item itself
    return [{'label': item, 'disabled': disabled_state[item], 'value': item} for item in items]


def first_three_unique(series):
    """
    Returns the first three unique values from a series. If the concatenated string exceeds
    60 characters, it is truncated and '...' is appended.

    Args:
        series (pd.Series): The input series containing values.

    Returns:
        str: A string of up to three unique values, truncated if necessary.
    """
    
    if len(series) > 60:  # Check if the length exceeds 60 characters
        return series[:60].rsplit(' ', 1)[0] + '...'  # Truncate and add '...'
    else:
        return series  # Return the joined string as is if within the limit


def get_tectonic_plate_overlay():
    with open(TECTONICS_PLATES_DIR, 'r') as f:
        js_tect = json.load(f)

    gdf = gpd.GeoDataFrame.from_features(js_tect)

    return gdf


def load_tectonic_lines(file_path):
    all_segments = []
    current_name = None
    current_line_coords = []
    current_lines = []  # list of LineStrings for current_name

    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            if line.startswith('>'):
                # Save previous LineString if valid
                if current_line_coords and len(current_line_coords) >= 2:
                    current_lines.append(LineString(current_line_coords))
                # Save previous group as MultiLineString if valid
                if current_name and current_lines:
                    all_segments.append({
                        'name': current_name,
                        'geometry': MultiLineString(current_lines)
                    })
                # Reset for next group
                current_name = line.lstrip('>').strip()
                current_line_coords = []
                current_lines = []
            else:
                try:
                    lon, lat = map(float, line.split())
                    current_line_coords.append((lon, lat))
                except ValueError:
                    continue

        # Save last line and last group
        if current_line_coords and len(current_line_coords) >= 2:
            current_lines.append(LineString(current_line_coords))
        if current_name and current_lines:
            all_segments.append({
                'name': current_name,
                'geometry': MultiLineString(current_lines)
            })

    gdf = gpd.GeoDataFrame(all_segments)

    return gdf

