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
var VIZRT = { pureTemplate:  function(){
	var mapping;


	var self = {
		mapping: mapping,

		triggerClickOnSegment: function(segmentControlId, dataId){
			$(segmentControlId+" .segment[data-viz='"+dataId+"']").trigger('click', true);
		},

        triggerDragSlider: function(sliderId, value){
            var deg = 1 * value.split(" ")[2];
            self.slider.slider('setValue', deg);
        },
        
		mapValue: function(id, value, prevented){
			if(!prevented){
				VIZRT.pureTemplate.mapping.setTextValue(id, value);
			}
		},
        
		pushSubsetFields: function(id, object, prevented){
			if(!prevented){
				self.mapping.setSubsetFields(id, object);
			}
		},

		mapConcept: function(value){
			self.triggerClickOnSegment('.concepts', value.concept);
		},

		mapText: function(value){
			$("#field_01-text").val(value);
		},

		mapPlate: function(value, prevented){
			$('.plate :checkbox').trigger('click', true);
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
		$(".segment", this).removeClass("active");
		$(event.target).closest(".segment").addClass("active");
	});

	$('.concepts .segment').on('click', function(event, preventDefault){
		var subsetObject = {
			concept: $(this).data('viz'),
			variant: 'Default'
		};
		VIZRT.pureTemplate.pushSubsetFields('field_-concept-variant-choice', subsetObject, preventDefault);
	});

    $('#rotationSlider').on('slide', function(event, preventDefault){
        var subsetObject = VIZRT.pureTemplate.rotationSubset;
        subsetObject.rotation ="0 0 "+event.value;
        VIZRT.pureTemplate.pushSubsetFields('field_03-rotation', subsetObject, preventDefault);
    });

	// Keypress handler for simple text fields
	$('.boundTextField').on('keyup', function(event){
		VIZRT.pureTemplate.mapping.setTextValue($(this).attr("id"), $(this).val());
	});

	$('.plate :checkbox').on('click', function(event, preventDefault){
		var convertedValue = ($(this).is(':checked')) ? 1 : 0;
		VIZRT.pureTemplate.mapValue('field_02-blaclback', convertedValue, preventDefault);
	});

	// Set up iframe bindings
	VIZRT.pureTemplate.mapping = bindFields({
		setters: {
		 	'field_01-text': VIZRT.pureTemplate.mapText,
			'field_02-blaclback': VIZRT.pureTemplate.mapPlate
		},
		subsetSetters: {
			'field_-concept-variant-choice': VIZRT.pureTemplate.mapConcept
		}
	});

	$("html").ajaxStart(function () { $(this).addClass("wait"); });
	$("html").ajaxStop(function () { $(this).removeClass("wait"); });

});

