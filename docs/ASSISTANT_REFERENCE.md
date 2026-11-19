# SPREAD assistant reference

Generated from the live SPREAD catalog by `tests/assistant/reference.py`; do not edit by hand.

For every option: where it is in the interface, what it does, and what to type to the assistant.
Ask the assistant *"where is …?"* and it opens the panel and highlights the control.

Data operations (filters, statistics, column edits, macros) are documented in the [README](../README.md#what-it-understands).

## Settings

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Color by | Settings › Node style › Color by | Colour by: from the dropdown menu of this section it's possible to choose the fill-in colour of the nodes according to metadata. | `color by id` · `color by cluster` |
| Show labels / Hide labels | Settings › Node style › Show labels / Hide labels | Show Labels: the switch will allow to choose whether to show the node labels or hide them. You can choose which label to show from the dropdown menu just below. | `show labels` · `hide labels` |
| Labels | Settings › Node style › Labels | Show Labels: the switch will allow to choose whether to show the node labels or hide them. You can choose which label to show from the dropdown menu just below. | `labels id` · `labels cluster` |
| Font size | Settings › Node style › Font size | Font Size: the font size for the labels can be chosen either by dragging the slider or by specifying a size in the box. | `font size 30` · `set font size to 30` |
| Highlight labels | Settings › Node style › Highlight labels | Highlight Label: use the text box to provide a search term for the labels to highlight the corresponding nodes. Supports Regular Expressions. | `highlight labels "IT-003"` |
| Individual segments | Settings › Node style › Individual segments | Individual segments: use the switch to turn each node into a pie chart showing the breakdown of the members contained in it. The breakdown is based on the category used for the Colour by settings. | `individual segments` · `show individual segments` |
| Radius size (%) | Settings › Node size › Radius size (%) | Node Size (%): the overall node size can be increased or decreased through this option, either by using the slider or through the box. | `radius size 260` · `set radius size to 260` |
| Kurtosis (%) | Settings › Node size › Kurtosis (%) | Kurtosis (%): the area of the nodes is correlated with the members inside them by default. Using this section's slider or box, the node's size can be increased or decreased based on the distribution's kurtosis of the nodes. By increasing this value, you raise the percentage by which the node size grows per member in the node, thus nodes with a larger number of members will have a larger area and will stick out more. | `kurtosis 90` · `set kurtosis to 90` |
| Show labels / Hide labels | Settings › Branch style › Show labels / Hide labels | Show Labels: this option will allow you to choose whether to show the branch labels or hide them. | `show labels of branches` · `hide labels of branches` |
| Font size | Settings › Branch style › Font size | Font Size: this option allows you to choose the font size for the labels using the slider or the provided box. | `font size 30 of branches` |
| Scaling (%) | Settings › Branch style › Scaling (%) | Scaling (%): this option allows to increase or decrease the overall branches' lenght, by using the slider or by specifying a value in the box below it. | `scaling 103` · `scaling 103 of branches` |
| Collapse branches | Settings › Branch style › Collapse branches | Collapse Branches: use the slider or enter a value in the box to collapse all branches shorter than the specified lenght. Nodes falling in that interval will be merged together. Branch lenght values are scaled to the branch lenghts defined in the original tree data. | `collapse branches 3` · `collapse branches 3 of branches` |
| Log scale | Settings › Branch style › Log scale | Log Scale: by checking the box, all lenghts of all branches will be scaled logarithmically. | `log scale` · `show log scale` |
| Cut off branches longer than | Settings › Branch cutoffs › Cut off branches longer than |  | `cut off branches longer than 3` · `cut off branches longer than 3 for long branches` |
| Display / Hide / Shorten | Settings › Branch cutoffs › Display / Hide / Shorten | Display: show long branches as normal (default). | `display` · `shorten` |
| Static / Dynamic | Settings › Rendering › Static / Dynamic | Static: the tree layout is calculated when the tree is generated and remains static (but interactive); relative branch lenght and scaling (from the original tree data) will always be mantained as long as the Real Branch Lenght option is checked. | `static` · `static rendering` |
| Selected only / All | Settings › Rendering › Selected only / All |  | `selected only` · `selected only rendering` |
| Unreal branch length / Real branch length | Settings › Rendering › Unreal branch length / Real branch length |  | `unreal branch length` · `unreal branch length rendering` |

## Tree

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Show tooltips | Tree › ⋮ menu › Show tooltips |  | `show tooltips` · `hide tooltips` |
| Centre tree | Tree › ⋮ menu › Centre tree | Centre Tree: adjusts view settings so that the tree's core is at the centre of the working area. | `centre tree` |
| Static redraw | Tree › ⋮ menu › Static redraw | Static Redraw: refreshes the tree and redraws it with the preset layout. | `static redraw` |
| Original tree | Tree › ⋮ menu › Original tree | Original Tree: reloads the page and restores the tree to the same state and layout it had when it was initially loaded. It will ask for confirmation before leaving the page. Caution : this function will cause the loss of all changes you made to the tree. | `original tree` |
| Show hypothetical | Tree › ⋮ menu › Show hypothetical |  | `show hypothetical` · `hide hypothetical` |
| Select all | Tree › ⋮ menu › Select all |  | `select all` |
| Deselect all | Tree › ⋮ menu › Deselect all |  | `deselect all` |
| Collapse selected nodes | Tree › ⋮ menu › Collapse selected nodes |  | `collapse selected nodes` |
| Expand selected nodes | Tree › ⋮ menu › Expand selected nodes |  | `expand selected nodes` |
| Expand all | Tree › ⋮ menu › Expand all |  | `expand all` |
| Hide selected nodes | Tree › ⋮ menu › Hide selected nodes |  | `hide selected nodes` |
| Show selected subtrees | Tree › ⋮ menu › Show selected subtrees |  | `show selected subtrees` |
| Show whole tree | Tree › ⋮ menu › Show whole tree | Centre Tree: adjusts view settings so that the tree's core is at the centre of the working area. | `show whole tree` |
| Save SPREAD | Tree › ⋮ menu › Save SPREAD |  | `save spread` |
| Load SPREAD | Tree › ⋮ menu › Load SPREAD |  | `load spread` |
| Download image | Tree › ⋮ menu › Download image |  | `download image png` · `png` |

## Legend

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Related nodes selection / Visual selection | Legend › ⋮ menu › Related nodes selection / Visual selection |  | `related nodes selection` · `related nodes selection in the legend` |
| Select all items | Legend › ⋮ menu › Select all items |  | `select all items` · `select all items in the legend` |
| Invert selection | Legend › ⋮ menu › Invert selection |  | `invert selection` · `invert selection in the legend` |
| Clean selection | Legend › ⋮ menu › Clean selection |  | `clean selection` · `clean selection in the legend` |
| Color by | Legend › ⋮ menu › Color by |  | `color by id` · `color by cluster` |
| Maximum number of groups | Legend › ⋮ menu › Maximum number of groups |  | `maximum number of groups 50000` · `maximum number of groups 50000 in the legend` |
| Mininimum group size | Legend › ⋮ menu › Mininimum group size |  | `mininimum group size 50000` · `mininimum group size 50000 in the legend` |
| Data category | Legend › ⋮ menu › Data category |  | `data category character` · `character` |
| Group order | Legend › ⋮ menu › Group order |  | `group order size descending` · `size descending` |
| Color scheme | Legend › ⋮ menu › Color scheme |  | `color scheme category` · `category` |
| Quick gradient | Legend › ⋮ menu › Quick gradient |  | `quick gradient` · `quick gradient in the legend` |
| List view / Histogram view | Legend › ⋮ menu › List view / Histogram view |  | `histogram view` · `histogram view in the legend` |

## Metadata table

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Selected only | Metadata › ⋮ menu › Selected only |  | `selected only in the table` |
| Add metadata | Metadata › ⋮ menu › Add metadata |  | `add metadata` · `add metadata in the table` |
| Edit metadata | Metadata › ⋮ menu › Edit metadata |  | `edit metadata` · `edit metadata in the table` |
| Add metadata for selection | Metadata › ⋮ menu › Add metadata for selection |  | `add metadata for selection` · `add metadata for selection in the table` |
| Edit metadata for selection | Metadata › ⋮ menu › Edit metadata for selection |  | `edit metadata for selection` · `edit metadata for selection in the table` |
| Delete metadata | Metadata › ⋮ menu › Delete metadata |  | `delete metadata` · `delete metadata in the table` |
| Select column | Metadata › ⋮ menu › Select column |  | `select column id` · `id in the table` |
| Move to the first position | Metadata › ⋮ menu › Move to the first position |  | `move to the first position` · `move to the first position in the table` |
| Set as figure legend | Metadata › ⋮ menu › Set as figure legend |  | `set as figure legend` · `set as figure legend in the table` |
| Resize columns | Metadata › ⋮ menu › Resize columns |  | `resize columns` · `resize columns in the table` |
| Show hypothetical | Metadata › ⋮ menu › Show hypothetical |  | `show hypothetical in the table` · `hide hypothetical in the table` |
| Download table | Metadata › ⋮ menu › Download table |  | `download table csv` · `csv` |
| Select all | Metadata › card header › Select all |  | `select all` · `select all in the table` |
| Clean selection | Metadata › card header › Clean selection |  | `clean selection` · `clean selection in the table` |

## Map

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Join by coordinates / Join by metadata | Map › ⋮ menu › Join by coordinates / Join by metadata | Join by coordinates/by metadata: The toggle allows you to aggregate points on the map based on the geographical proximity of the provided coordinates or based on the values of the loaded metadata. In the first case, you can define a numerical value for delta , which determines the degree of aggregation. | `join by coordinates` · `join by metadata` |
| Set value | Map › ⋮ menu › Set value |  | `set value 1` · `set value 2` |
| Reset to default | Map › ⋮ menu › Reset to default |  | `reset to default` · `reset to default on the map` |
| Min marker radius | Map › ⋮ menu › Min marker radius | Minimum/Maximum marker radius: With these two fields, you can adjust the size of the points on the map by defining a minimum and a maximum radius. The initial size is relative to the number of nodes located at the same geographical coordinates. | `min marker radius 3` · `min marker radius 3 on the map` |
| Max marker radius | Map › ⋮ menu › Max marker radius | Minimum/Maximum marker radius: With these two fields, you can adjust the size of the points on the map by defining a minimum and a maximum radius. The initial size is relative to the number of nodes located at the same geographical coordinates. | `max marker radius 3` · `max marker radius 3 on the map` |
| Reset to default | Map › ⋮ menu › Reset to default |  |  |
| Select all | Map › ⋮ menu › Select all |  | `select all` · `select all on the map` |
| Deselect all | Map › ⋮ menu › Deselect all |  | `deselect all` · `deselect all on the map` |
| Pie Chart mode / Heatmap mode | Map › ⋮ menu › Pie Chart mode / Heatmap mode | Pie Chart mode/Heatmap mode: This toggle allows you to change the visualization mode of the points on the map. With the first option (selected by default), the points will be displayed with pie charts based on the categories of the tree nodes, while with the second option, a blur effect is applied to the nodes. | `pie chart mode` · `pie chart mode on the map` |
| Map zoom factor | Map › Map zoom factor |  | `map zoom factor 5` · `map zoom factor 5 on the map` |
| Map zoom level | Map › Map zoom level |  | `map zoom level 3` · `map zoom level 3 on the map` |
| Center map at coordinates | Map › Center map at coordinates |  | `center map at coordinates` · `center map at coordinates on the map` |
| Fit map to all markers | Map › Fit map to all markers |  | `fit map to all markers` · `fit map to all markers on the map` |

## Panels

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Settings | top bar › Settings |  | `settings` · `show settings` |
| Map | top bar › Map |  | `map` · `show map` |
| Metadata | top bar › Metadata |  | `metadata` · `show metadata` |
| Legend | top bar › Legend |  | `legend` · `show legend` |
| Video | top bar › Video |  | `video` · `show video` |
| Full screen | top bar › Full screen |  | `full screen` · `show full screen` |

## Timeline video

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Play timeline | Video › player › Play timeline |  | `play timeline` |
| Pause timeline | Video › player › Pause timeline |  | `pause timeline` |
| Timeline playback speed | Video › player › Timeline playback speed |  | `timeline playback speed 0.5x` · `timeline playback speed 1x` |
| Timeline position (%) | Video › player › Timeline position (%) |  | `timeline position 50` · `set timeline position to 50` |

## ReporTree zooms

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Show selection alerts / Hide selection alerts | ReporTree zooms › ⋮ menu › Show selection alerts / Hide selection alerts |  | `show selection alerts` · `hide selection alerts` |
| Select involved nodes | ReporTree zooms › ⋮ menu › Select involved nodes |  | `select involved nodes` · `select involved nodes cluster` |
| Clean selection | ReporTree zooms › ⋮ menu › Clean selection |  | `clean selection` · `clean selection cluster` |
| Use current settings / Do not use current settings | ReporTree zooms › ⋮ menu › Use current settings / Do not use current settings |  | `use current settings` · `show use current settings` |
| Load cluster | ReporTree zooms › ⋮ menu › Load cluster |  | `load cluster` · `load cluster cluster` |
| Load in new tab | ReporTree zooms › ⋮ menu › Load in new tab |  | `load in new tab` · `load in new tab cluster` |
| Use current settings / Do not use current settings | ReporTree zooms › ⋮ menu › Use current settings / Do not use current settings |  |  |
| Load cluster | ReporTree zooms › ⋮ menu › Load cluster |  |  |
| Load in new tab | ReporTree zooms › ⋮ menu › Load in new tab |  |  |

## SPREAD macros

| Option | Where | What it does | Ask the assistant |
| --- | --- | --- | --- |
| Log scale at 10 | top bar › Macros (▷▷) › Log scale at 10 |  | `log scale at 10` |
| Preset space time | top bar › Macros (▷▷) › Preset space time |  | `preset space time` |
