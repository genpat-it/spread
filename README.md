# SPREAD, Spatiotemporal Pathogen Relationships and Epidemiological Analysis Dashboard

Previously known as GrapeTree Extended.

## Table of Contents

- [Description](#description)
- [Use SPREAD](#use-spread)
- [Instruction to run it locally](#instruction-to-run-it-locally)
  - [Prerequisites](#prerequisites)
  - [Install and use live-server](#install-and-use-live-server)
  - [Run SPREAD locally](#run-spread-locally)
  - [Load geoJSON or cooridates data](#load-geojson-or-cooridates-data)
  - [Load files](#load-files)
  - [Save or load a compatible JSON file](#save-or-load-a-compatible-json-file)
  - [Zooms for clusters](#zooms-for-clusters)
- [Docker](#docker)
- [Videos](#videos)
- [Documentation](#documentation)
- [Credits](#credits)
- [License](#license)
- [Citation](#citation)

## Description

<p align="center">
<br>
<img src="https://github.com/genpat-it/spread/assets/87088754/547ff60b-04ec-4fa3-85b6-5f07f55402a6" width="340">
<br>
</p>

# 

The project is based on [GrapeTree](https://github.com/achtman-lab/GrapeTree), a fully interactive, tree visualization program within EnteroBase, which supports facile manipulations of both tree layout and metadata. Please see more info [here](https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html).

The idea was to extend the original project in order to conducts spatio-temporal analyses with an integrated geographic information system (GIS) as well as a data visualization system across time. The web application allows users to upload geographic coordinates and temporal data related to each sample and allows to display them reflecting the selection in the tree on the map and vice versa, and reproducing a timelapse visualization both in the map and in the tree.

## Use SPREAD

You can download the project and easly running it locally, but we provide also a ready to use version freely available following link below:

* [https://cohesive.izs.it/grapetree/spread/](https://cohesive.izs.it/grapetree/spread/)

Please note, you can load sensitive data, your dataset is visualised client-side in the browser. No data is transmitted, and no tracking cookies are used. The only data downloaded from the internet are the visualisation (JavaScript) code, fonts and map tiles.

## Instruction to run it locally

To run the project locally you need to set a web server, **node packages http-server** or **live-server** works pretty fine.

### Prerequisites

* **Node js**. Download the latest stable release of NodeJS from [https://nodejs.org](https://nodejs.org) and install it using all the default options.

### Install and use live-server

Now you will be able to install `live-server` globally on your machine using the node package manager `npm` command line tool, this will allow you to run a web server from anywhere on your computer.

```
npm install live-server -g
```

To start a web server, in terminal open the directory containing your static web files and start the server with the following command:

```
live-server
```

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

Here the minimum metadata mandatory schema:

|ID             |category            |MST-21x1.0 |MST-15x1.0 |MST-7x1.0  |MST-4x1.0 |
|---------------|--------------------|-----------|-----------|-----------|----------|
|00.00000.00.00 |sample of interest  |cluster_4  |cluster_11 |cluster_22 |cluster_32|

### Source files in place

Insert the folders containing the zooms (a newick and optionally a related .tsv metadata file) at the same level as the general tree. Following the **output generated by ReporTree**, the names of folders and files should adhere to the following conventions:

* `prefix_threshold-definition_cluster-name`: for example, `Reportree_MST-7x1.0_cluster_334`
* `prefix_sample-id_closest-name`: for example, `Reportree_sample-01_closest5`


For a concrete example, the structure should follow this convention:

```
Reportree.nwk
Reportree_metadata_w_partitions.tsv
Reportree_MST-7x1.0_cluster_335
  |__ MST-7x1.0_cluster_335.nwk
  |__ MST-7x1.0_cluster_335_metadata_w_partitions.tsv
Reportree_MST-7x1.0_cluster_887
  |__ MST-7x1.0_cluster_887.nwk
  |__ MST-7x1.0_cluster_887_metadata_w_partitions.tsv
...
```

### URL parameters

Once the zooms folders are moved as shown, it is necessary to specify some parameters, and this can be done in two ways.

#### 1. All information needed are in the metatada file

There are 2 parameters to specify: `zooms`, which is mandatory, and `zooms_prefix`, which is optional.

* `zooms` parameter can have one of the following syntax:
  - `zooms=category,sample%20of%20interest@5,7`: the code will find in the general metadata file the clusters for the samples marked as sample of interest for the indicated thresholds.
  - `zooms=category,sample%20of%20interest@all`: the code will find in the general metadata file the clusters for the samples marked as sample of interest for all thresholds.
  - `zooms=@7,21`: The code will use `category` and `sample of interest` by default to find clusters in the general metadata file for the indicated thresholds.
  - `zooms=all`: The code will use `category` and `sample of interest` by default to find clusters in the general metadata file for all thresholds.

> **Please note.** As permitted by ReporTree, different thresholds can be separated by commas (e.g., @5,8,16), but you can also define ranges by specifying them with a hyphen to separate the minimum and maximum (e.g., @5,8,10-20).

* `zooms_prefix` should define a prefix used for files and folders. This is optional, by default application take it from the `.nwk` file name.
  - `zooms_prefix=zoom` indicates that folder names and file names start with `zoom_`.

#### 2. Provide an index

At the same level as the zoom folders, alternatively, it's possible to insert a .txt file (for example `zooms.txt`) containing a simple list of `prefix_threshold-name_cluster-name` for each zoom folder in the full tree root. By using this index, it is possible to cover a second use case, that of closest zooms, and it is also possible to indicate elements in the list composed as follows: `prefix_sample-name_closest-name`. To give a more concrete example:

```
Reportree_MST-7x1.0_cluster_335
Reportree_MST-7x1.0_cluster_510
Reportree_MST-7x1.0_cluster_519
Reportree_MST-15x1.0_cluster_556
Reportree_sample-01_closest5
Reportree_sample-01_closest10
Reportree_sample-02_closest5
Reportree_sample-02_closest10
```

then add in the URL one of the following parameters:

* `zooms_list=category,sample%20of%20interest@zooms.txt`: the code will find in the general metadata file the clusters for the samples marked as sample of interest for zooms indicated by `zooms.txt` file.
* `zooms_list=@zooms.txt` or `zooms_list=zooms.txt`: the code will use `category` and `sample of interest` by default to find clusters in the general metadata file for zooms indicated by `zooms.txt` file.

> **Please note.** The `prefix` should match the name of the `.nwk` file.

## Docker

### Building from DockerHub

```bash
docker pull ghcr.io/genpat-it/spread:latest
docker run -d -p 3000:80 --name spread ghcr.io/genpat-it/spread:latest
```
You can surf the spread instance by visiting `http://<IP_ADDRESS_OR_HOSTNAME>:3000`  in your web browser.

### Building from Source

To build the Docker image from the source code, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/genpat-it/spread
```

2. Navigate to the cloned directory:

```bash
cd spread
```

3. Build the Docker image using the provided Dockerfile. You can also specify the port using the `PORT` build argument:

```bash
docker build . -t spread --build-arg PORT=3000
```

4. Once the image is built, you can run the Docker container:

```bash
docker run -d spread
```

This will expose the application running inside the container on port 3000 of your host machine.

## Videos

- **Video Settings:** [Watch Video](https://genpat.izs.it/genpat_wiki/Dashboards/SPREAD/2023-08-04-grapetree-settings.mp4) - This video demonstrates the settings configuration in SPREAD.

- **Video Upload:** [Watch Video](https://genpat.izs.it/genpat_wiki/Dashboards/SPREAD/2023-08-04-grapetree-upload.mp4) - This video shows how to upload data in SPREAD.

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

### Icons

* [https://iconic.app/](https://iconic.app/)

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but without any warranty; without even the implied warranty of merchantability or fitness for a particular purpose. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).

## Citation

If you run SPREAD, please cite the publication:

* [de Ruvo A, De Luca A, Bucciacchio A, Castelli P, Di Lorenzo A, Radomski N, Di Pasquale A (2024) SPREAD: Spatiotemporal Pathogen Relationships and Epidemiological Analysis Dashboard](https://veterinariaitaliana.izs.it/index.php/VetIt/article/view/3476/1426)

* [De Luca A, de Ruvo A, Di Lorenzo A, Bucciacchio A, Di Pasquale A (2023) GrapeTree integration with spatio-temporal data visualization: a holistic understanding of diseases and the transmission pathways](https://www.veterinariaitaliana.izs.it/index.php/GEOVET23/article/view/3224)

Also, SPREAD relies on the work of other developers. So, there are other tools that you must cite:
* ReporTree: https://genomemedicine.biomedcentral.com/articles/10.1186/s13073-023-01196-1
* GrapeTree: http://www.genome.org/cgi/doi/10.1101/gr.232397.117
