== 0.0.2 Form Validation (4/2/13)
* Added form validation for where, geometry and returnFields fields.
* If the where and geometry fields are blank, the API request will not be made
* If not one return field is selected, the API request will not be made
* If "ALL FIELDS" and another field are selected, the API request will not be made
* In each case an alert will be displayed above the results div
