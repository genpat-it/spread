# SPREAD, Spatiotemporal Pathogens Relationships and Epidemiological Analysis Dashboard

> Previously known as GrapeTree Extended.

## Description

The project is based on [GrapeTree](https://github.com/achtman-lab/GrapeTree), a fully interactive, tree visualization program within EnteroBase, which supports facile manipulations of both tree layout and metadata. Please see more info [here](https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html).

The idea was to extend the original project in order to conducts spatio-temporal analyses with an integrated geographic information system (GIS) as well as a data visualization system across time. The web application allows users to upload geographic coordinates and temporal data related to each sample and allows to display them reflecting the selection in the tree on the map and vice versa, and reproducing a timelapse visualization both in the map and in the tree.

## Use SPREAD

You can download the project and easly running it locally, but we provide also a ready to use version freely available following link below:

* [https://cohesive.izs.it/grapetree/extended](https://cohesive.izs.it/grapetree/extended)

Please note, you can load sensitive data, your dataset is visualised client-side in the browser. No data is transmitted, and no tracking cookies are used. The only data downloaded from the internet are the visualisation (JavaScript) code, fonts and map tiles.

## Instruction to run it locally

To run the project locally you need to set a web server, **node packages http-server** or **live-server** works pretty fine.

### Prerequisites

* **Node js**. Download the latest stable release of NodeJS from [https://nodejs.org](https://nodejs.org) and install it using all the default options.

### Install and use live-server

Now you will be able to install `live-server` globally on your machine using the node package manager `npm` command line tool, this will allow you to run a web server from anywhere on your computer.

`npm install live-server -g`

To start a web server, in terminal open the directory containing your static web files and start the server with the following command:

`live-server`

### Run SPREAD locally

Download the .zip of the code from this repository, then unzip on a directory `DIR_SPREAD` (for example: `/tmp/spread`).

**Source files in place**

Produce your newick (`tree.nwk`) and metadata (`meta.tsv`) files and copy them inside `DIR_SPREAD`, then on terminal:

`live-server DIR_SPREAD`

Now you will be able to load data by url in your web browser, for example:

```
http://localhost:8080?tree=tree.nwk&metadata=metadata.tsv
```

In the project you will find a `datasets` folder with some example data to load, you can use url to see them as well:

```
http://localhost:8080?tree=/datasets/test/tree.nwk&metadata=/datasets/test/metadata.tsv&geo=/datasets/test/points.geojson
```

### Load geoJSON or cooridates data

The dashboard is able to recognize `.geojson` file passed as `geo` parameter by query string:

`&geo=points.geojson`

Alternatively you can integrate in `metadata.tsv` longitute and latitude values and pass them as query string parameters in the place of geoJSON. For example, if in the `.tsv` you define `x` for longitude and `y` for latitude, just add `&longitude=x&latitude=y` in the url in this way:

`&metadata=metadata.tsv&longitude=x&latitude=y`

Using our data example:

```
http://localhost:8080?tree=/datasets/test/tree.nwk&metadata=/datasets/test/metadata.tsv&longitude=x&latitude=y
```

> **Important**
>
> If you use `longitude` and `latitude` to name coordinates in the `.tsv` file, there is no need to pass them as query string parameters, so simply use:

`&metadata=metadata.tsv`

### Load files

The can also directly upload files by dragging them over the tree, over the initial droppable area or using load buttons provided in the UI. In this case you don't neet to user parameters in the url. You can drag or load a `.nwk` file followed by a `.tsv` file containing metadata and optionally a `.geojson` file containing geo-saptial information.

> **Important**
>
> .nwk file should be loaded before loading metadata or geoJson files.

### Save or load a compatible JSON file

Dashboard allows you to download a complete JSON file including metadata and configurations. Generated JSON file can be loaded with the same drag or load functionalities seen previously, this is very useful if you want to save your work or share it.

## Zooms for clusters

SPREAD can be used to visualize results generated with [ReporTree](https://github.com/insapathogenomics/ReporTree). Very briefly, ReporTree allows the generation of a series of zooms on clusters by specifying samples of interest and parameters such as thresholds and distances.

In this context, it's possible to indicate to SPREAD the presence of available zooms using the methods described below.

> **Please note.**
> Here, we describe how to set up and place the needed newick and metadata files for zooms. However, if you produce these files directly with ReporTree, the structure, composition, and positions are already correct. 

### Metadata columns and data

Following the **output generated by ReporTree**, here the minimum metadata mandatory schema:

|CMP            |category            |MST-21x1.0 |MST-15x1.0 |MST-7x1.0  |MST-4x1.0 |
|---------------|--------------------|-----------|-----------|-----------|----------|
|00.00000.00.00 |Samples of interest |cluster_4  |cluster_11 |cluster_22 |cluster_32|

### Source files in place

Insert the folders containing the zooms (a newick and optionally a related .tsv metadata file) at the same level as the general tree.

Following the **output generated by ReporTree**, the names of folders and files should adhere to the following convention:

> `prefix_threshold-definition_cluster-name`: for example, `ReporTree_MST-7x1.0_cluster_334`

> **Important**: it is assumed that the `threshold-definition` is included between two `_`.

For a concrete example, the structure should follow this convention:

```
tree.nwk
metadata_w_partitions.tsv
zoom_MST-7x1.0_cluster_335
  |__ zoom_MST-7x1.0_cluster_335.nwk
  |__ zoom_MST-7x1.0_cluster_335_metadata_w_partitions.tsv
zoom_MST-7x1.0_cluster_887
  |__ zoom_MST-7x1.0_cluster_887.nwk
  |__ zoom_MST-7x1.0_cluster_887_metadata_w_partitions.tsv
...
```

### URL parameters

Once the zooms folders are moved as shown, it is necessary to specify some parameters, and this can be done in two ways.

#### 1. All information needed are in the metatada file

There are 2 parameters to specify: `zooms`, which is mandatory, and `zooms_prefix`, which is optional.

* `zooms` parameter can have one of the following syntax:
  - `zooms=category,sample%20of%20interest@5,7`: The code will find in the general metadata file the clusters for the samples marked as samples of interest for the indicated thresholds.
  - `zooms=category,sample%20of%20interest@all`: The code will find in the general metadata file the clusters for the samples marked as samples of interest for all thresholds.
  - `zooms=@7,21`: The code will use `category` and `sample of interest` by default to find clusters in the general metadata file for the indicated thresholds.
  - `zooms=all`: The code will use `category` and `sample of interest` by default to find clusters in the general metadata file for all thresholds.

> **Please note.** As permitted by ReporTree, different thresholds can be separated by commas (e.g., @5,8,16), but you can also define ranges by specifying them with a hyphen to separate the minimum and maximum (e.g., @5,8,10-20).

* `zooms_prefix` should define a prefix used for files and folders if it differs from the one provided by default by ReporTree, `Reportree_`.
  - `zooms_prefix=zoom` indicates that folder names and file names start with `zoom_`.

#### 2. Provide an index

At the same level as the zoom folders, alternatively, it's possible to insert a .txt file (for example `zooms.txt`) containing a simple list of `prefix_threshold-name_cluster-name` for each zoom folder in the full tree root. To give a more concrete example:

```
zoom_MST-7x1.0_cluster_335
zoom_MST-7x1.0_cluster_510
zoom_MST-7x1.0_cluster_519
zoom_MST-7x1.0_cluster_556
zoom_MST-7x1.0_cluster_574
zoom_MST-7x1.0_cluster_650.1
zoom_MST-7x1.0_cluster_887
zoom_MST-7x1.0_cluster_907
```

then add in the URL `zooms_list=zooms.txt` as parameter.

## Available Languages and translations

Currently, the available languages are English and Italian. However, the application can be easily extended with new translations. If you would like to contribute, you can use the `en.js` or `it.js` file as a template from the `i18n` folder in this repository and translate the values. For any information or support regarding this, do not hesitate to contact bioinformatica@izs.it.

## Documentation

* [https://cohesive.izs.it/wiki/user/Dashboards/GrapeTree/GrapeTree_extended.html](https://cohesive.izs.it/wiki/user/Dashboards/GrapeTree/GrapeTree_extended.html)
* [https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html](https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html)

## Credits

### Tree

* [https://github.com/achtman-lab/GrapeTree](https://github.com/achtman-lab/GrapeTree)

### Map

* [https://www.openstreetmap.org/](https://www.openstreetmap.org/)
* [https://leafletjs.com/](https://leafletjs.com/) 

### Metadata table

* [https://github.com/ag-grid/ag-grid](https://github.com/ag-grid/ag-grid)

### Legend

* [https://github.com/bgrins/spectrum](https://github.com/bgrins/spectrum)
