0.2.2 Option Improvements (4/14/13) [dw]
* Changed "ALL FIELDS" to "RETURN ALL FIELDS" label in return fields option 
* Set "Select a service..." as the first option in the initial service option

0.2.1 Spatial Relationship Bug (4/3/13) [dw]
* Spatial relationship wasn't being passed in the API request even though it 
was in the query displayed. 

0.2.0 Form Validation (4/2/13) [dw]
* Added form validation for where, geometry and returnFields fields.
* If the where and geometry fields are blank, the API request will not be made
* If not one return field is selected, the API request will not be made
* If "ALL FIELDS" and another field are selected, the API request will not be made
* In each case an alert will be displayed above the results div
