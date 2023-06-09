 require([
        "esri/WebMap",
        "esri/views/SceneView",
        "esri/layers/GeoJSONLayer",
        "esri/layers/TileLayer",
        "esri/layers/FeatureLayer",
        "esri/widgets/Expand",
        "esri/widgets/Legend",
        "esri/widgets/Home",
        "esri/widgets/Search",
        "esri/core/promiseUtils",
        "esri/core/reactiveUtils"
         ], 
        function (
        WebMap,
        SceneView,
        GeoJSONLayer,
        TileLayer,
        FeatureLayer,
        Expand,
        Legend,
        Home,
        Search,
        promiseUtils,
        reactiveUtils
      )
         {

/*****************************************
 * Define map and view
*****************************************/
   const map = new WebMap({
      basemap: ({
        baseLayers: [new TileLayer({
         		 url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
          })]
      }),
      ground: {
        surfaceColor: [255, 255, 255]
      }
    });

    const view = new SceneView({
      container: "viewDiv",   
      camera: {
      position: [78.9629, 20.5937, 20000000],
      heading: 0, //face due east
      tilt: 0 //looking from a bird's eye view
       },     
      qualityProfile: "high",
      map: map,
      alphaCompositingEnabled: true,
      environment: {
         starsEnabled: true,
         atmosphereEnabled: true
         },
         highlightOptions: {
         fillOpacity: 0,
         },
         });
   
/*********************************************
  * Adding plateTectonic border to the map scene
 ***********************************************/
      
 const plateTectonicBorders = new FeatureLayer({
    url: "https://services2.arcgis.com/cFEFS0EWrhfDeVw9/arcgis/rest/services/plate_tectonics_boundaries/FeatureServer",
    elevationInfo: {
      mode: "on-the-ground"},
     renderer: {
      type: "simple",
      symbol: {
        type: "line-3d",
        symbolLayers: [
          {
            type: "line",
            material: { color: [224, 52, 40, 0.7] },
            size: 3
          }
        ]
      }
    }
  });
  map.add(plateTectonicBorders);
          
/**********************************************
 Adding the PAGER-USGS data set to the mapscene
***********************************************/      

 const layer = new GeoJSONLayer ({
          url: "https://earthquake.usgs.gov/fdsnws/event/1/query",
          copyright: "USGS-PAGER-Earthquakes",
          // Using customParameters to set the query parameters
          // get the all red alert earthquakes since 1905
          //order the results by magnitude
          customParameters: {
            format: "geojson",
            starttime: "1905-01-01",
            endtime: new Date().toISOString().split("T")[0],
            orderby: "magnitude",
            minmagnitude: 1,
            alertlevel: "red"        
           },
   
          // to show earthquakes around the world
          definitionExpression: "place LIKE '%'",
            title: "USGS Earthquakes",
            renderer: {
            // apply unique values to alert levels and adding their visualisation parameters
              type: "unique-value",
              field: "alert",
                uniqueValueInfos: [
                  {
                    value: "red",
                    symbol: {
              type: "simple-marker",
              style: "circle",
              outline: {
                  color: "red",
                  width: 1
                       }
                     }
                  },
                  {
                     value: "orange",
                     symbol:  {
              type: "simple-marker",
              style: "circle",
              outline: {
                  color: "orange",
                  width: 1
                       }
                     }
                  },
                  {
                      value: "yellow",
                      symbol:  {
              type: "simple-marker",
              style: "circle",
              outline: {
                  color: "yellow",
                  width: 1
                       }
                     }
                  },
                  {
                      value: "green",
                      symbol:  {
              type: "simple-marker",
              style: "circle",
              outline: {
                  color: "#136d15",
                  width: 1
                       }
                     }
                  }
                ],
          visualVariables: [
              {
                type: "size",
                field: "mag",
                stops: [
                  {
                    value: 4.5,
                    size: "1px"
                  },
                  {
                    value: 6,
                    size: "20px"
                  },
                  {
                    value: 8,
                    size: "60px"
                  }
                ]
              }
            ]
          },
   
// Adding a popup template to each earthquake
   popupTemplate: {
            title: "Earthquake Info",
            content:
              "Magnitude <b>{mag}</b> {type} hit {place} on <b>{time}</b> <br/><br/>  <a href={url}>More info</a>",
            fieldInfos: [
              {
                fieldName: "time",
                format: {
                  dateFormat: "short-date-short-time"
                }
              }
            ]
          }
        });

   layer.load().then(
     () => {
          // Update the layer custom parameters with the selected alert level on user select
          // fetch the data from the feed by calling refresh method.   
          const selectTopEarthquakes = document.getElementById(
            "selectTopEarthquakes");
          selectTopEarthquakes.addEventListener(
            "calciteRadioButtonGroupChange",
            (event) => {
              const alertlevel = selectTopEarthquakes.selectedItem.value;
              layer.customParameters.alertlevel = alertlevel;
              layer.refresh();
              updateQuakeList();
            }
          );
          updateQuakeList();
        });

        async function updateQuakeList() {
          const query = layer.createQuery().set({
            outFields: ["mag", "title", "time", layer.objectIdField],
            returnGeometry: true
          });
          const { features, fields } = await layer.queryFeatures(query);

          document.getElementById("results").innerHTML = "";
          for (const feature of features) {
            const { mag, title, time } = feature.attributes;
            const item = document.createElement("calcite-pick-list-item");
            const date = new Date(time).toLocaleString();
            const description = `Magnitude: ${mag} - Date: ${date}`;
            item.setAttribute("label", title);
            item.setAttribute("description", description);
            item.addEventListener("click", () => {
              view.popup.open({
                features: [feature],
                location: feature.geometry
              });
            });
            document.getElementById("results").appendChild(item);
          }
          document.getElementById(
            "resultsHeading"
          ).innerHTML = `<b>${features.length}</b> ${layer.customParameters.alertlevel} alert level earthquakes.`;
        }
        //In order to zoom to the selected feature
        view.popup.watch("selectedFeature", function(graphic){
          if(graphic.layer === layer){
            view.popup.triggerAction(0); //This calls the popup Zoom To action
          }
        })
        
map.add(layer);
/*********************************************
* Adding legend to the map scene
***********************************************/
 // add a legend for the earthquakes layer
        const legendExpand = new Expand({
          expandTooltip: "Legend",
          view,
          content: new Legend({
            view
          }),
          expanded: false
        });
        view.ui.add(legendExpand, "top-left");

 /*********************************************
 * Adding Home button to the map scene
***********************************************/
// Add the home button to the top left corner of the view
		const homeBtn = new Home({
		view,
    });
		view.ui.add(homeBtn, "top-left");

 /*********************************************
 * Adding Search button to the map scene
***********************************************/
 //specify content with a widget
   let searchWidget = new Search({
     view: view
   });

   let expand = new Expand({
     expandIconClass: "esri-icon-search",
     view: view,
     content: searchWidget
   });
   view.ui.add(expand, "top-left");
    });
