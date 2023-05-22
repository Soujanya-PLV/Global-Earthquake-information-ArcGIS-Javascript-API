 require([
        "esri/WebMap",
        "esri/views/SceneView",
        "esri/layers/GeoJSONLayer",
        "esri/layers/TileLayer",
        "esri/layers/FeatureLayer",
        "esri/layers/GroupLayer",
        "esri/widgets/Expand",
        "esri/widgets/Legend",
        "esri/widgets/Home"
      ], function (
        WebMap,
        SceneView,
        GeoJSONLayer,
        TileLayer,
        FeatureLayer,
        GroupLayer,
        Expand,
        Legend,
        Home
      )
	  {
        const layer = new GeoJSONLayer({
          url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
          copyright: "USGS - PAGER - Earthquakes since 1905",
          // Use customParameters to set the query parameters
          // get the all red alert Japan earthquakes since 1905
          //order the results by magnitude
          customParameters: {
            format: "geojson",
            starttime: "1905-01-01",
            endtime: new Date().toISOString().split("T")[0],
            minlatitude: 24,
            maxlatitude: 46,
            minlongitude: 123,
            maxlongitude: 145,
            orderby: "magnitude",
            minmagnitude: 1,
            alertlevel: "red"
          },
          // only show earthquakes that mentions japan
          //definitionExpression: "place LIKE '%Japan'",
          effect: "bloom(2 1px 0)",
          title: "USGS Earthquakes",
          renderer: {
            // apply unique values to alert levels
            type: "unique-value",
            field: "alert",
            uniqueValueInfos: [
              {
                value: "red",
                symbol: createQuakeSymbol("red")
              },
              {
                value: "orange",
                symbol: createQuakeSymbol("orange")
              },
              {
                value: "yellow",
                symbol: createQuakeSymbol("yellow")
              },
              {
                value: "green",
                symbol: createQuakeSymbol("#136d15")
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

        const map = new WebMap({
          // Basemap with blurred world imagery, and highlighted Japan
          basemap: {
            baseLayers: [
              new TileLayer({
                url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
                effect: "blur(8px) brightness(1.2) grayscale(0.8)"
              }),
              new GroupLayer({
                effect: "brightness(150%)",
                layers: [
                  new TileLayer({
                    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
                  }),
                  new FeatureLayer({
                    url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer",
                    definitionExpression: "ISO='JP'",
                    renderer: {
                      type: "simple",
                      symbol: {
                        type: "simple-fill",
                        color: "white"
                      }
                    },
                    effect: "bloom(4 0 0)",
                    blendMode: "destination-in"
                  })
                ]
              })
            ]
          },
          layers: [layer]
        });

        const view = new SceneView({
          map: map,
          container: "viewDiv",
          constraints: {
            minScale: 18489297.737236
          },
          zoom: 3,
          //center: [144.701, 34.956] - rn japan , can be used to make india the start
        });

        layer.load().then(() => {
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

		// Add the home button to the top left corner of the view
		const homeBtn = new Home({
          view: Sceneview
           });
          view.ui.add(homeBtn, "top-left");

        // assign symbols to earthquakes matching their alert level.
        function createQuakeSymbol(color) {
          return {
            type: "simple-marker",
            // color: null,
            outline: {
              color: color,
              width: "2px"
            }
          };
        }
      });