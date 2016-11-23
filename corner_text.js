/*
Copyright (c) 2016 Vizrt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

(MIT License)

*/

// Store our data and functions in our own namespace
var VIZRT = { cornerTemplate:  function(){
    var mapping;
    var slider;
    var scaleSubset;

    var self = {
        mapping: mapping,
        slider: slider,
        scaleSubset: scaleSubset,

        triggerClickOnSegment: function(segmentControlId, dataId){
            $(segmentControlId+" .segment[data-viz='"+dataId+"']").trigger('click', true);
        },

        triggerDragSlider: function(sliderId, value){
            var deg = 1 * value.split(" ")[0];
            self.slider.slider('setValue', deg);
        },

        mapValue: function(id, value, prevented){
            if(!prevented){
                VIZRT.cornerTemplate.mapping.setTextValue(id, value);
            }
        },


        mapCorner: function(value, prevented){
            if(!prevented){
                self.triggerClickOnSegment('.corner', value);
            }
        },

        mapPlate: function(value, prevented){
            $('.plate :checkbox').trigger('click', true);
        },

        mapText: function(value){
            $("#field_02-text").val(value);
        },
        mapScale: function(matrix){
            self.scaleSubset = matrix;
            self.triggerDragSlider('#zoomSlider', matrix.scaling);
        },

        pushSubsetFields: function(id, object, prevented){
            if(!prevented){
                self.mapping.setSubsetFields(id, object);
            }
        },

        mapConcept: function(value){
            self.triggerClickOnSegment('.concepts', value.concept);

        },

        hideWell: function(well){
            well.hide();
        },

        showWell: function(well){
            well.show();
        },

        disableWell: function(well){
            well.addClass('disabled');
            well.find(".btn").addClass('disabled');
            well.find('input').prop('disabled',true);
        },

        enableWell: function(well){
            well.removeClass('disabled');
            well.find(".btn").removeClass('disabled');
            well.find('input').prop('disabled',false);
        }
    };
    return self;
}()
};

$(document).ready(function() {
    // Enable bootstrap tooltips
    $('[data-toggle="tooltip"]').tooltip({container: 'body', delay: { "show": 1000, "hide": 90 }, placement: 'auto'});

    // Common visual toggle handler for segmented controls
    $(".segmentedControl").on('click', function (event) {
        if($(event.target).hasClass("segment") || $(event.target).parents().hasClass("segment")){
            $(".segment", this).removeClass("active");
            $(event.target).closest(".segment").addClass("active");
        }
    });
    
    $('.concepts .segment').on('click', function(event, preventDefault){
        var subsetObject = {
            concept: $(this).data('viz'),
            variant: 'Default'
        };
        VIZRT.cornerTemplate.pushSubsetFields('field_-concept-variant-choice', subsetObject, preventDefault);
    });
    
    $('.corner .segment').on('click', function(event, preventDefault){
        VIZRT.cornerTemplate.mapValue('field_01-corner', $(this).data("viz"), preventDefault);
    });
    $('#zoomSlider').on('slide', function(event, preventDefault){
        var subsetObject = VIZRT.cornerTemplate.scaleSubset;
        subsetObject.scaling =event.value+" "+event.value+" 0";
        VIZRT.cornerTemplate.pushSubsetFields('field_06-scale', subsetObject, preventDefault);
    });

    $('.plate :checkbox').on('click', function(event, preventDefault){
        var convertedValue = ($(this).is(':checked')) ? 1 : 0;
        VIZRT.cornerTemplate.mapValue('field_05-plate', convertedValue, preventDefault);
    });

    // Keypress handler for simple text fields
    $('.boundTextField').on('keyup', function(event){
        VIZRT.cornerTemplate.mapping.setTextValue($(this).attr("id"), $(this).val());
    });

    // Set up iframe bindings
    VIZRT.cornerTemplate.mapping = bindFields({
        setters: {
            'field_02-text': VIZRT.cornerTemplate.mapText,
            'field_01-corner': VIZRT.cornerTemplate.mapCorner,
            'field_05-plate': VIZRT.cornerTemplate.mapPlate,
        },
        subsetSetters: {
            'field_-concept-variant-choice': VIZRT.cornerTemplate.mapConcept,
            'field_06-scale': VIZRT.cornerTemplate.mapScale
        }
    });

    $("html").ajaxStart(function () { $(this).addClass("wait"); });
    $("html").ajaxStop(function () { $(this).removeClass("wait"); });

    VIZRT.cornerTemplate.slider = $('#zoomSlider').slider({
        formatter: function(value) {
            return 'Current value: ' + value;
        }
    });
});
