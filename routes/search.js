var mongoose = require('mongoose');
var Float = require('mongoose-float').loadType(mongoose, 10);
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: '',
    user: '',
    password: '',
    database: ''
});


var searchschema = mongoose.Schema({
    business_id: {
        type: String,
    },
    name: {
        type: String,
    },
    neighborhood: {
        type: String
    },
    address: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    postal_code: {
        type: String
    },
    latitude: {
        type: Float
    },
    longitude: {
        type: Float
    },
    stars: {
        type: Float
    },
    is_open: {
        type: Number
    },
    attributes: {
        type: Array
    },
    categories: [String],
    hours: {
        type: Array
    },
    type: {
        type: String
    }
});

var business_b = mongoose.model('business', searchschema, 'business');


function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i].name === obj) {
            return true;
        }
    }
    return false;
}

function query_db(res, name, location, sort, username, card, park, appo, state) {
    if (name || location || state) {
        var se = "SELECT B.name, B.address, B.city, B.state, B.postal_code, B.stars, B.latitude, B.longitude, C.allow As credit, P.garage, P.street, P.validated, P.lot, P.valet, AP.allow As appo FROM business B INNER JOIN parking P ON B.business_id = P.business_id INNER JOIN credit C ON B.business_id = C.business_id INNER JOIN appointment AP ON B.business_id = AP.business_id WHERE";
        if (name) {
            se = se + " lower(B.name) = lower('" + name + "') AND";
            //query = "SELECT B.name, B.address, B.city, B.state, B.postal_code, B.stars, B.latitude, B.longitude, M.name AS mname , A.name AS aname FROM business B INNER JOIN museum M ON lower(M.city) = lower(B.city) INNER JOIN airport A ON lower(A.city) = lower(B.city) WHERE lower(B.name) = lower('" + name + "')";
        }
        if (location) {
            se = se + " lower(B.city) = lower('" + location + "') AND";
            //query = "SELECT B.name, B.address, B.city, B.state, B.postal_code, B.stars, B.latitude, B.longitude, M.name AS mname , A.name AS aname FROM business B INNER JOIN museum M ON lower(M.city) = lower(B.city) INNER JOIN airport A ON lower(A.city) = lower(B.city) WHERE lower(B.name) = lower('" + name + "')";
        }
        if (state) {
            se = se + " lower(B.state) = lower('" + state + "') AND";
        }
        if (card == "card") {
            se = se + " C.allow = 1 AND"
        }
        if (park == "park") {
            se = se + " (P.garage = 1 OR P.street = 1 OR P.validated = 1 OR P.lot = 1 OR P.valet = 1) AND"
        }
        if (appo == "appo") {
            se = se + " AP.allow = 1 AND"
        }
        se = se.slice(0, -4);
        if (sort == "stars high-low") {
            se = se + " ORDER BY B.stars DESC";
        }
        if (sort == "stars low-high") {
            se = se + " ORDER BY B.stars ASC";
        }
        if (sort == "name (A-Z)") {
            se = se + " ORDER BY B.name ASC";
        }
        query = se;
        connection.query(query, function (err, rows) {
            if (rows.length == 0) {

                query_mongo(res, name, location, state, username, sort, card, park, appo);
                return;
            }
            var cityname = rows[0].city;

            senew = "SELECT M.name AS mname, A.name AS aname FROM museum M USE INDEX(Midx_city), airport A USE INDEX(Aidx_city) WHERE";
            senew = senew + " lower(M.city) = lower('" + cityname + "') AND lower(A.city) = lower('" + cityname + "')";
            connection.query(senew, function (err, xrows) {


                var lat = [];
                var lon = [];

                for (var i = 0; i < rows.length; i++) {
                    lat[i] = rows[i].latitude;
                    lon[i] = rows[i].longitude;
                }

                function creditCard(obj) {
                    if (obj.credit == 1) return " Yes";
                    else return " No";
                }

                function parking(obj) {
                    var output = "";
                    if (obj.garage == 1) output = output + " Garage";
                    if (obj.street == 1) output = output + " Street";
                    if (obj.validated == 1) output = output + " Validated";
                    if (obj.lot == 1) output = output + " Lot";
                    if (obj.valet == 1) output = output + " Valet";
                    if (output === "") output = "No Parking Allowed";
                    return output;
                }

                function creditAppointment(obj) {
                    if (obj.appo == 1) return " Yes";
                    else return " No";
                }

                var num_of_business = 1;
                var num_of_mus = 1;
                var num_of_air = 1;
                var business = [{
                    name: rows[0].name,
                    address: rows[0].address,
                    city: rows[0].city,
                    state: rows[0].state,
                    postal_code: rows[0].postal_code,
                    stars: rows[0].stars,
                    credit: creditCard(rows[0]),
                    parking: parking(rows[0]),
                    appo: creditAppointment(rows[0])
                }];
                for (var j = 1; j < rows.length; j++) {
                    if (!contains(business, rows[j].address)) {
                        var obj = {
                            name: rows[j].name,
                            address: rows[j].address,
                            city: rows[j].city,
                            state: rows[j].state,
                            postal_code: rows[j].postal_code,
                            stars: rows[j].stars,
                            credit: creditCard(rows[j]),
                            parking: parking(rows[j]),
                            appo: creditAppointment(rows[j])
                        };
                        num_of_business++;
                        business[business.length] = obj;
                    }
                }

                if (xrows.length == 0) {
                    res.render('search.html', {
                        user: username,
                        lat: lat,
                        long: lon,
                        results: business,
                        museum: [],
                        airport: [],
                        title: "Here you might also be interested in " + cityname,
                        numberOfEach: {business: num_of_business, airport: 0, museum: 0}
                    });
                    return;
                }
                var muse = [{name: xrows[0].mname}];
                var airport = [{name: xrows[0].aname}];
                for (var k = 1; k < xrows.length; k++) {
                    if (!contains(muse, xrows[k].mname)) {
                        var obj = {name: xrows[k].mname};
                        muse[muse.length] = obj;
                        num_of_mus++;
                    }
                }
                for (var c = 1; c < xrows.length; c++) {

                    if (!contains(airport, xrows[c].aname)) {
                        var obj = {name: xrows[c].aname};
                        airport[airport.length] = obj;
                        num_of_air++;
                    }
                }
                output_persons(res, business, muse, airport, lat, lon, username, cityname, num_of_business, num_of_mus, num_of_air);
            })
        });
    } else {
        res.render("index.html");
    }
}


function query_mongo(res, name, location, state, username, sort, card, park, appo) {

    var airportResult = [];
    var museumResult = [];

    if (location) {
        query = "SELECT /*+ index(A Aidx_city) cold cache */ A.name FROM airport A WHERE lower(A.city) = lower('" + location + "')";
        connection.query(query, function (err, airport_a) {
            airportResult = airport_a;
            query_m = "SELECT /*+ index(M Midx_city) cold cache */ M.name FROM museum M WHERE lower(M.city) = lower('" + location + "')";
            connection.query(query_m, function (err, museum_a) {
                museumResult = museum_a;
                start_mongoose_search(res, name, location, state, username, sort, airportResult, museumResult, card, park, appo);
            })
        })
    } else {
        start_mongoose_search(res, name, location, state, username, sort, airportResult, museumResult, card, park, appo);
    }
}

function start_mongoose_search(res, name, location, state, username, sort, airportResult, museumResult, card, park, appo) {

    if (sort == "stars high-low") {
        var chooseSort = {stars: -1};
    }
    if (sort == "stars low-high") {
        var chooseSort = {stars: 1};
    }
    if (sort == "name (A-Z)") {
        var chooseSort = {name: 1};
    }

    var lon = [];
    var lat = [];
    var business = [];
    if (chooseSort) {
        business_b.find({
            categories: {'$regex': '.*' + name + '.*', '$options': 'i'},
            city: {'$regex': '.*' + location + '.*', '$options': 'i'}
        }, 'name address city state postal_code latitude longitude stars attributes', {sort: chooseSort}, function (err, restaurant) {
            for (var i = 0; i < restaurant.length; i++) {
                business[i] = {
                    name: restaurant[i].name,
                    address: restaurant[i].address,
                    city: restaurant[i].city,
                    state: restaurant[i].state,
                    postal_code: restaurant[i].postal_code,
                    stars: restaurant[i].stars,
                    credit: creditCut(restaurant[i].attributes),
                    parking: parkCut(restaurant[i].attributes),
                    appo: appoCut(restaurant[i].attributes)
                };
                lat[i] = restaurant[i].latitude;
                lon[i] = restaurant[i].longitude;
            }
            refineResult(res, business, museumResult, airportResult, lat, lon, username, location, business.length, museumResult.length, airportResult.length, card, park, appo);

        });
    } else {
        business_b.find({
            categories: {'$regex': '.*' + name + '.*', '$options': 'i'},
            city: {'$regex': '.*' + location + '.*', '$options': 'i'},
            state: {'$regex': '.*' + state + '.*', '$options': 'i'}
        }, 'name address city state postal_code latitude longitude stars attributes', function (err, restaurant) {
            for (var i = 0; i < restaurant.length; i++) {
                business[i] = {
                    name: restaurant[i].name,
                    address: restaurant[i].address,
                    city: restaurant[i].city,
                    state: restaurant[i].state,
                    postal_code: restaurant[i].postal_code,
                    stars: restaurant[i].stars,
                    credit: creditCut(restaurant[i].attributes),
                    parking: parkCut(restaurant[i].attributes),
                    appo: appoCut(restaurant[i].attributes)
                };
                lat[i] = restaurant[i].latitude;
                lon[i] = restaurant[i].longitude;
            }

            refineResult(res, business, museumResult, airportResult, lat, lon, username, location, business.length, museumResult.length, airportResult.length, card, park, appo);
        });
    }
}

function parkCut(obj) {
    if (obj == null) return " No";
    for (var i = 0; i < obj.length; i++) {
        if (obj[i].indexOf("BusinessPark") >= 0) {

            var parkCatch = obj[i];
            var afterCut = parkCatch.substr(parkCatch.indexOf('{') + 1, parkCatch.length - 2);
            var result = "";
            var stringSplit = afterCut.split(",");
            var outPut = [" Garage", " Street", " Validated", " Lot", " Valet"];
            for (var j = 0; j < stringSplit.length; j++) {
                if (stringSplit[j].indexOf("True") >= 0) {
                    result += outPut[j];
                }
            }
            if (result == "") return " No";
            else return result;
        }
    }
    return " No";
}

function creditCut(obj) {
    if (obj == null) return " No";
    for (var i = 0; i < obj.length; i++) {
        if (obj[i].indexOf("BusinessAcceptsCreditCard") >= 0) {
            var creditCatch = obj[i];
            if (creditCatch.indexOf("True") >= 0) {
                return " Yes";
            } else return " No";
        }
    }
    return " No";
}


function appoCut(obj) {
    if (obj == null) return " No";
    for (var i = 0; i < obj.length; i++) {
        if (obj[i].indexOf("RestaurantsReservation") >= 0) {
            var creditCatch = obj[i];
            if (creditCatch.indexOf("True") >= 0) {
                return " Yes";
            } else return " No";
        }
    }
    return " No";
}


function refineResult(res, business, muse, airport, lat, lon, username, city_name, num_of_business, num_of_mus, num_of_air, card, park, appo) {

    var finalBusiness = [];

    for (var i = 0; i < business.length; i++) {
        var numberOf = 1;
        if (card == "card") {
            if (business[i].credit == " No") {
                if (numberOf == 1) {
                    num_of_business = num_of_business - 1;
                    numberOf = 0;
                }
            }
        }
        if (park == "park") {
            if (business[i].parking == " No") {
                if (numberOf == 1) {
                    num_of_business = num_of_business - 1;
                    numberOf = 0;
                }
            }
        }
        if (appo == "appo") {
            if (business[i].appo == " No") {
                if (numberOf == 1) {
                    num_of_business = num_of_business - 1;
                    numberOf = 0;
                }
            }
        }
        if (numberOf == 1) {
            finalBusiness[finalBusiness.length] = business[i];
        }
    }

    output_persons(res, finalBusiness, muse, airport, lat, lon, username, city_name, num_of_business, num_of_mus, num_of_air);


}


function output_persons(res, business, muse, airport, lat, lon, username, city_name, num_of_business, num_of_mus, num_of_air) {
    res.render('search.html', {
        user: username,
        lat: lat,
        long: lon,
        results: business,
        museum: muse,
        airport: airport,
        title: "Here you might also be interested in " + city_name,
        numberOfEach: {business: num_of_business, airport: num_of_air, museum: num_of_mus}
    });
}


exports.startSearch = function (req, res) {
    query_db(res, req.query.name, req.query.location, req.query.sort, req.session.user, req.query.card, req.query.park, req.query.appo, req.query.state);
};


//*********************Detail**********************************//

exports.startSearchAgain = function (req, res) {
    req.session.choiceByUser = req.query.userChoice;
    query_db_detail(res, req.query.userChoice, req.session.user);

};

function query_db_detail(res, Detailname, userName) {

    query = "SELECT /*+ index(B1 Bidx_name) cold cache */ B1.name AS thisname, B1.latitude AS lat, B1.longitude AS lon, /*+ index(B2 Bidx_name) cold cache */ B2.name, B2.latitude, B2.longitude FROM business B1, business B2";
    query += " WHERE B1.name = '" + Detailname + "'";
    query += " AND SQRT(POWER((B1.latitude - B2.latitude), 2) + POWER((B1.longitude - B2.longitude), 2)) <= 0.05 GROUP BY B2.name UNION ALL";
    query += " SELECT /*+ index(B1 Bidx_name) cold cache */ B1.name AS thisname, B1.latitude AS lat, B1.longitude AS lon, A.name, A.latitude, A.longitude FROM business B1, airport A";
    query += " WHERE B1.name = '" + Detailname + "' AND SQRT(POWER((B1.latitude - A.latitude), 2) + POWER((B1.longitude - A.longitude), 2)) <= 0.05 GROUP BY A.name";
    query += " UNION ALL SELECT /*+ index(B1 Bidx_name) cold cache */ B1.name AS thisname, B1.latitude AS lat, B1.longitude AS lon, M.name, M.latitude, M.longitude FROM business B1, museum M";
    query += " WHERE B1.name = '" + Detailname + "'";
    query += " AND SQRT(POWER((B1.latitude - M.latitude), 2) + POWER((B1.longitude - M.longitude), 2)) <= 0.05 GROUP BY M.name";
    connection.query(query, function (err, rows) {
        var thisname = rows[0].thisname;
        var clat = rows[0].lat;
        var clon = rows[0].lon;
        var lat = [];
        var lon = [];
        for (var i = 0; i < rows.length; i++) {
            lat[i] = rows[i].latitude;
            lon[i] = rows[i].longitude;
        }
        var se = "select U.name,R.stars,R.review from business B inner join review R on B.business_id = R.business_id inner join user U on R.user_id = U.user_id where B.name = '" + Detailname + "'";
        connection.query(se, function (err, row) {
            var sb = "select count(R.review) as num from business B inner join review R on B.business_id = R.business_id inner join user U on R.user_id = U.user_id where B.name = '" + Detailname + "'";
            connection.query(sb, function (err, xrow) {
                var count = xrow[0].num;
                start_mongodb_search(Detailname, rows, row, count, thisname, lon, lat, userName, clat, clon, res);

            });
        })
    })
}

function start_mongodb_search(Detailname, rows, row, count, thisname, lon, lat, userName, clat, clon, res) {
    business_b.find({name: Detailname}, 'attributes', function (err, restaurant) {
        var finalR = [];
        var initR = restaurant[0].attributes;
       
        for (var i = 0; i < initR.length; i++) {
            if (initR[i].indexOf('{') >= 0) {
                var stringSplit = initR[i].split(":");
                var firstC = stringSplit[0].replace(/([A-Z])/g, ' $1').trim()
                var lastC = cutArray(initR[i]);
                finalR[finalR.length] = firstC + ":" + lastC;
            } else {
                var cutting = initR[i].split(":");
                var firstC = cutting[0].replace(/([A-Z])/g, ' $1').trim()
                var lastC = cutting[1].replace("_", / /g);
                finalR[finalR.length] = firstC + ": " + lastC;
            }
        }

        res.render('detail.html', {
            results: rows,
            review: row,
            count: count,
            thisname: thisname,
            long: lon,
            lat: lat,
            user: userName,
            centerla: clat,
            centerlo: clon,
            businessInfo: finalR
        })
    })
}
    function cutArray(Obj) {
        var afterCut = Obj.substr(Obj.indexOf('{') + 1, Obj.length - 2);
        var result = " ";
        var stringSplit = afterCut.split(",");
        for (var i = 0; i < stringSplit.length; i++) {
            if (i == 0){
                if (stringSplit[i].indexOf("True") >= 0) {
                    var sub = stringSplit[i].substr(1, stringSplit[i].indexOf(':') - 2);
                    result = result + sub + " ";
                }
            } else{
                if (stringSplit[i].indexOf("True") >= 0) {
                    var sub = stringSplit[i].substr(2, stringSplit[i].indexOf(':') - 3);
                    result = result + sub + " ";
                }
            }
        }
        return result;
    }


//*********************Review**********************************//

    exports.insertReviewNow = function (req, res) {

        query_db_review(res, req.query.usersReview, req.query.stars, req.session.user.username, req.session.choiceByUser, req.session.user);

    };

    function query_db_review(res, review, stars, userName, userChoice, user_to_render) {
        console.log(userName);
        query = "INSERT INTO review(review_id, user_id, business_id, stars, review)"
        query += "VALUES((SELECT HEX(AES_ENCRYPT(123, '" + review + "'))), (SELECT user_id from user WHERE name = '" + userName + "'), (SELECT B.business_id from business B WHERE B.name = '" + userChoice + "'),'" + stars + "' , ' " + review + "')"
        connection.query(query, function (err, rows) {
            query_db_detail(res, userChoice, user_to_render);
        });
    }


