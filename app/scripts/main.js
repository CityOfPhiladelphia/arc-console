var app = app || {
    Views: {},
    Models: {},
    Collections: {},
    config: {},
    drawControl: {},
    drawnItems: new L.featureGroup(),
    request: {},
    form: {},
    map: {},
    validators: {}
};

// $CONFIG
// The base of your ArcGIS Server instance
app.config.serviceBase = 'http://gis.phila.gov/ArcGIS/rest/services/';
// The names of the fields that shouldn't be included in the returnFields drop-down. Probably the ArcGIS Server system fields
app.config.excludedFields = ['OBJECTID', 'SHAPE', 'SHAPE.LEN', 'SHAPE.AREA', 'OBJECTID_1'];
// The basemap for drawing the geometry
app.config.basemap = new L.TileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}.png');
// The JSON file with services info
app.config.servicesFile = '../services.json';
// The max bounds of the geometry map so that users don't drag too far away
app.config.maxBounds = new L.LatLngBounds([39.849719,-75.308533], [40.123346,-74.904785]);
// The center of the geometry map
app.config.mapCenter = new L.LatLng(39.952335, -75.163789);

//$FORM_TEMPLATES
//TODO: Compile as Underscore templates in index.html
app.templates = {
    'whereField': '\
                    <div><label for="{{id}}"><h4>Where:</h4></label>{{editor}}\
                    <br /><div class="alert"><button type="button" class="close" data-dismiss="alert">&times;</button><strong>Standard SQL queries work here</strong> (ex ADDRESS = \'908A N 3RD ST\'). Input a true statement like "1=1" to get all features</div>\
                  ',
    'geometryTypeField': '<div><label for="{{id}}"><h4>AND/OR with a geometry type of:</h4></label>{{editor}}</div>',
    'spatialRelField': '\
                        <div><label for="{{id}}"><h4>and a spatial relationship of:</h4></label>{{editor}}\
                        <br /><div class="alert geometry-alert"><button type="button" class="close" data-dismiss="alert">&times;</button><strong>Draw your geometry on the map</strong></div><div id="map"></div></div><br /><br />\
                        ',
    'geometryField': '<div>{{editor}}</div>',
    'returnFieldsField': '<div><h3>Response</h3><div><label for="{{id}}"><h4>I want the following fields included:</h4>{{editor}}</div><div>{{error}}</div>',                          
    'countsOnlyField': '<div><label for="{{id}}"><h4>I want only the total count of features returned:</h4></label>{{editor}}</div>',
    'idsOnlyField': '<div><label for="{{id}}"><h4>I want only the IDs of the features returned:</h4></label>{{editor}}</div>',
    'returnGeometryField': '<div><label for="{{id}}"><h4>I want the coordinates of the features included:</h4></label>{{editor}}</div></div>'
}

Backbone.Form.setTemplates(app.templates);

// FORM INPUT VALIDATORS
app.validators.noReturnFields = function(values, formValues) {
    var error = {
        type: 'No Return Fields Selected',
        message: 'You must select at least one field to be returned'
    };

    if (!formValues.returnFields) return error;
};

app.validators.allFieldsAndMore = function(values, formValues) {
    var error = {
        type: 'All fields and more selected',
        message: 'If you select "All Fields," don\'t select any other fields'
    };

    if (values.length > 1) {
        for (var i=0; i < values.length; i++) {
            if ($.inArray(values[i], ['*']) > -1) {
                return error;
            }
        }
    }
};

app.validators.noWhereOrGeometry = function(values, formValues) {
    var error = {
        type: 'No where or geometry entered',
        message: 'You must input a where clause and/or a geometry to query the API on'
    }
    if (!formValues.geometry && !formValues.where) {
        return error;
    }
}

// MODELS
// The user's form data is stored here
app.Models.Request = Backbone.Model.extend({
    
    initialize: function () {
        _.bindAll(this, 'fetch', 'parse');
    },

    defaults: {
        'inSR': 4326,
        'outSR': 4326,
        'idsOnly': 'False',
        'countsOnly': 'False',
        'returnGeometry': 'True',
        'layer': 0,
        'metadata': '',
        'description': ''
    },

    schema: {
        where: {
            type: 'Text', 
            help: 'Standard SQL queries work here. Input a true statement like "1=1" to get all features',
            template: 'whereField',
            validators: [app.validators.noWhereOrGeometry]
        },
        geometryType: {
            type: 'Select', 
            options: [
                {val: '', label: 'Choose a geometry type...'},
                {val: 'esriGeometryPoint', label: 'Point'},
                {val: 'esriGeometryPolyline', label: 'Line'},
                {val: 'esriGeometryPolygon', label: 'Polygon'}
            ],
            template: 'geometryTypeField',
            editorClass: 'chzn-select'
        },
        spatialRelationship: { 
            type: 'Select',
            options: [
                {val: '', label: 'Choose a relation...'},
                {val: 'esriSpatialRelIntersects', label: 'Intersects'},
                {val: 'esriSpatialRelContains', label: 'Contains'},
                {val: 'esriSpatialRelCrosses', label: 'Crosses'},
                {val: 'esriSpatialRelEnvelopeIntersects', label: 'Envelope Intersects'},
                {val: 'esriSpatialRelIndexIntersects', label: 'Index Intersects'},
                {val: 'esriSpatialRelOverlaps', label: 'Overlaps'},
                {val: 'esriSpatialRelTouches', label: 'Touches'},
                {val: 'esriSpatialRelWithin', label: 'Within'},
                {val: 'esriSpatialRelRelation', label: 'Relation'}
            ],
            editorClass: 'chzn-select',
            template: 'spatialRelField'
        },
        geometry: { 
            type: 'TextArea',
            editorClass: 'textbox',
            fieldAttrs: {id : 'geometry'},
            template: 'geometryField'
        },
        returnFields: { 
            type: 'Select',
            options: ['Select service again'],
            editorClass: 'chzn-select', 
            editorAttrs: {
                multiple: true,
                'data-placeholder': 'Select your return fields'
            },
            template: 'returnFieldsField',
            validators: [app.validators.noReturnFields, app.validators.allFieldsAndMore]
        },
        countsOnly: { 
            type: 'Radio', 
            options: ['True', 'False'],
            template: 'countsOnlyField'
        },
        idsOnly: { 
            type: 'Radio', 
            options: ['True', 'False'],
            template: 'idsOnlyField'
        },
        returnGeometry: { 
            type: 'Radio', 
            options: ['True', 'False'],
            template: 'returnGeometryField'
        }
    },

    fetch: function () {
        var options = {};

        options.data = { 
            where: this.get("where"),
            outFields: this.get("returnFields").toString(),
            geometry: this.get("geometry"),
            inSR: this.get("inSR"),
            outSR: this.get("outSR"),
            geometryType: this.get("geometryType"),
            returnGeometryOnly: this.get("returnGeometry"),
            returnIdsOnly: this.get("idsOnly"),
            returnCountOnly: this.get("countsOnly"),
            spatialRel: this.get("spatialRelationship"),
            f: 'json'
        };
        options.url = app.config.serviceBase + this.get("endpoint") + '/MapServer/' + this.get("layer") + '/query?';

        return Backbone.Model.prototype.fetch.call(this, options);
    },

    parse: function (data) {
        this.set("response", data);
    }
});

// Information for a single field in a service
app.Models.Field = Backbone.Model.extend();

// An endpoint that the server is exposing
app.Models.Service = Backbone.Model.extend();

// COLLECTIONS
// The available services defined by the JSON file
app.Collections.Services = Backbone.Collection.extend({

    initialize: function () {
        this.fetch();
    },

    model: app.Models.Service,

    fetch: function () {
        
        var options = {};

        options.url = app.config.servicesFile;
        options.dataType = 'json';

        return Backbone.Collection.prototype.fetch.call(this, options);
    },

    parse: function (data) {
        return data.services;
    }
});

// Holds all of the fields for a service
app.Collections.Fields = Backbone.Collection.extend({

    initialize: function (options) {
        _.bindAll(this, 'fetch');
        this.service = '';
        this.layer = 0;
    },

    model: app.Models.Field,

    fetch: function () {
        var options = {};
        options.data = { f : 'pjson' };
        options.url = app.config.serviceBase + this.service + '/MapServer/' + this.layer;
    
        return Backbone.Collection.prototype.fetch.call(this, options);
    },

    parse: function (data) {
        
        var fields = [];
        for (var i = 0; i < data.fields.length; i++) {
            fields.push(data.fields[i]);
        }

        return fields;
    }
});

// $VIEWS
// For the initial service list drop-down
app.Views.Services = Backbone.View.extend({
    initialize: function () {
        this.collection.on('reset', this.render, this);
    },


    events: {
        'change #endpoint-selector': 'endpointSelected'
    },

    endpointSelected: function (e) {
        var service = _.where(this.collection.toJSON(), {name: e.currentTarget.value})[0];
        app.request.set("endpoint", service.path);
        app.request.set("layer", service.layer);
        app.request.set("metadata", service.metadata);
        app.request.set("description", service.description);
    },

    render: function () {
        var services = {};
        services.endpoints = [];
        var endpoints = this.collection.toJSON();
        endpoints.unshift({name: 'Select a service....'});
        services.endpoints = endpoints;
        var template = _.template($('#endpoint-select-template').html(), services);
        $(this.el).html(template);
        $('.chzn-select').chosen();
    }

});

// The main view
app.Views.App = Backbone.View.extend({
    
    el: 'body',

    initialize: function () {
        // Build the form on the first select of a service
        app.request.once('change:endpoint', this.setupForm);
        // Loading gif
        app.request.on('request', function () {
            $('.loader').show();
        });
        app.request.on('change:response', function () {
            $('.loader').hide();
        });
        this.render();
    },

    render: function () {
        return this;
    },

    events: {
        'click .btn-submit': 'submitForm',
        // Activate the draw tool in the map depending on which geometry type was selected
        "change #c1_geometryType" : function (e) {
            if (e.currentTarget.value === 'esriGeometryPolygon') {
                app.drawControl.handlers.polygon.enable();
            }
            else if (e.currentTarget.value === 'esriGeometryPoint') {
                app.drawControl.handlers.marker.enable();
            } else {
                app.drawControl.handlers.polyline.enable();
            }
        }
    },

    setupForm: function (e) {
        app.form = new Backbone.Form({
            model: app.request
        }).render();

        // Add the form to the page
        $('.form').append(app.form.el);
    
        // On form change, commit to the request model
        $('.form').change(function() {
            app.form.commit();
        });

        $('.hidden').show();
        app.descriptionView = new app.Views.Description({model: app.request});
        $('.description').append(app.descriptionView.el);

        app.queryView = new app.Views.Query({model: app.request});
        // Add it to the page
        $('.query').append(app.queryView.el);

        app.resultView = new app.Views.Results({model: app.request});
    
        app.fieldsCollection = new app.Collections.Fields();
        app.fieldsView = new app.Views.Fields({collection: app.fieldsCollection});
        app.mapView = new app.Views.Map();
        $('.chzn-select').chosen();
    },

    submitForm: function () {
        $('.error-container').empty();
        // Validate the form for missing or invalid entries
        var errors = app.form.commit();
        if (errors) {
            this.showErrors(errors);
        } else {
            app.request.fetch();
        }
    },

    showErrors: function(errors) {
        for (var prop in errors) {
            var data = errors[prop];
            var template = _.template($('#validation-error-template').html(), errors[prop]);
            $('.error-container').append(template);
        }
    }
});

// The print out of the URL of the query
app.Views.Query = Backbone.View.extend({
    tagname : 'h2',

    className: 'query-url',

    initialize: function () {
        _.bindAll(this, 'render');
        this.model.bind('change', this.render);
        
    },
    
    render: function () {
        var options = { 
            base: app.config.serviceBase,
            layer: this.model.get("layer"),
            service: this.model.get("endpoint"),
            geometry: this.model.get("geometry"),
            where: this.model.get("where"),
            returnCountsOnly: this.model.get("countsOnly"),
            spatialRel: this.model.get("spatialRelationship"),
            inSR: this.model.get("inSR"),
            outSR: this.model.get("outSR"),
            geometryType: this.model.get("geometryType"),
            returnIdsOnly: this.model.get("idsOnly"),
            returnCountOnly: this.model.get("countsOnly"),
            returnGeometry: this.model.get("returnGeometry")
                      }
        if (this.model.get("returnFields")) {
            options.returnFields = this.model.get("returnFields").toString();
        } else {
            options.returnFields = "";
        }
        var template = _.template($("#query-template").html(), options);
        $(this.el).html(template);
    }
});

app.Views.Description = Backbone.View.extend({
    tagname: 'h2',

    initialize: function () {
        _.bindAll(this, 'render');
        this.model.bind('change:description', this.render);
        this.render();
    },

    render: function () {
        var details = this.model.toJSON();
        var data = { service: details };
        var template = _.template($('#description-template').html(), data);
        $(this.el).html(template);
    }
});

app.Views.Results = Backbone.View.extend({
    initialize: function () {
        this.model.on('change:response', this.render, this);
    },

    render: function () {
        $('.query-results').empty();
        $('.query-results').html(JSON.stringify(this.model.get("response"), undefined, 4));
        // Scroll down to the result
        $('html,body').animate({
            scrollTop: $('.query-results').offset().top
        }, 250);
    }
});

app.Views.Map = Backbone.View.extend({
    initialize: function () {
        // Create the map object
        app.map = L.map('map', {
        	center: app.config.mapCenter,
            zoom: 13,
            attributionControl: false,
            touchZoom: true,
            dragging: true,
            maxBounds: app.config.maxBounds
        });
            
        // Add the basemap
        this.basemap = app.config.basemap
        app.drawnItems = new L.FeatureGroup();
        app.map.addLayer(app.drawnItems);
        
        app.drawControl = new L.Control.Draw({
            polyline: {
                shapeOptions: {
                    color: '#7D26CD'
                }
            },
            circle: false,
            rectangle: false,
            marker: true,
            polygon: {
                shapeOptions : {
                    color: '#7D26CD'
                }
            }
        });

        app.map.addControl(app.drawControl);

        // When a marker is placed - construct the geometry string
        app.map.on('draw:marker-created', function(e) {
            var drawnGeometry = {};
            drawnGeometry.spatialReference = {'wkid': 4326};
            
            app.drawnItems.clearLayers()

            // Add the polygon drawn to the map
            app.drawnItems.addLayer(e.marker);
            drawnGeometry.x = e.marker._latlng.lng;
            drawnGeometry.y = e.marker._latlng.lat;
            app.form.setValue({geometry: JSON.stringify(drawnGeometry)});
            app.form.commit();
        });

        // When a polygon or line is drawn - construct the geometry string
        app.map.on('draw:poly-created', function(e) {

            var drawnGeometry = {};
            drawnGeometry.spatialReference = {'wkid': 4326};
            
            app.drawnItems.clearLayers()

            app.drawnItems.addLayer(e.poly);

            if (app.request.get("geometryType") === 'esriGeometryPolyline') {
                drawnGeometry.paths = [];
                var tempArray = [];

                for (var i=0; i < e.poly._latlngs.length; i++) {
                    var lat = e.poly._latlngs[i].lat;
                    var lng = e.poly._latlngs[i].lng;
                    tempArray.push([lng, lat]);
                }

                drawnGeometry.paths.push(tempArray);
                app.form.setValue({geometry: JSON.stringify(drawnGeometry)});
                app.form.commit();
            }

            if (app.request.get("geometryType") === 'esriGeometryPolygon') {
                drawnGeometry.rings = [];
                var tempArray = [];
                drawnGeometry.spatialReference = {'wkid': 4326};

                for (var i=0; i < e.poly._latlngs.length; i++) {
                    var lat = e.poly._latlngs[i].lat;
                    var lng = e.poly._latlngs[i].lng;
                    tempArray.push([lng, lat]);
                }
                                                                      
                tempArray.push([e.poly._latlngs[0].lng, e.poly._latlngs[0].lat]);
                drawnGeometry.rings.push(tempArray);
                app.form.setValue({geometry: JSON.stringify(drawnGeometry)});
                app.form.commit();
            }
        });
        
        //TODO: Construct polyline and market objects too
        this.render();
    },

    render: function() {
        this.basemap.addTo(app.map);
    }
});

app.Views.Fields = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'render', 'setEndpoint');
        this.collection.on('reset', this.render, this);
        app.request.on('change:endpoint', this.setEndpoint);
        this.setEndpoint();
    },

    render: function() {
        var fields = [];
        
        var allFieldsOption = {val: '*', label: 'RETURN ALL FIELDS'};
        fields.push(allFieldsOption);
        
        // Exclude Esri shapefile fields that users don't ever need
        this.collection.each(function (model) {
            var field = model.get("name");
            if ($.inArray(field, app.config.excludedFields) === -1) {
                fieldObj = { val: field, label: field }
                fields.push(fieldObj);
            }

        });
        // Set the returnFields drop-down to the fields of the selected endpoint
        app.form.fields.returnFields.editor.setOptions(fields);
        // Refresh the Chosen selects
        $(".chzn-select").trigger("liszt:updated");
    },

    setEndpoint: function () {
        this.collection.service = app.request.get("endpoint");
        this.collection.layer = app.request.get("layer");
        this.collection.fetch();
    }
});

$(function () {
    // Load the model behind for the form
    app.request = new app.Models.Request();
    
    // Load the app view
    app.appView = new app.Views.App();

    // Get the services of the ArcGIS Server instance
    app.services = new app.Collections.Services();
    
    // Set up the endpoints drop-down
    app.servicesView = new app.Views.Services({collection: app.services});
    
    // Add the endpoint drop-down view to the page
    $('.endpoints-container').append(app.servicesView.el);

    // Enable Chosen select menus
    // $('.chzn-select').chosen();
});
