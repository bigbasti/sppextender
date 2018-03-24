window.onload = function(){ 
    var calcButton = document.createElement("a");
    var calcButtonText = document.createTextNode("Calculate Sums For this Affiliate");
    calcButton.appendChild(calcButtonText);
    calcButton.setAttribute("href", "#");
    
    var backButton = document.createElement("a");
    var backButtonText = document.createTextNode("Back to table view");
    backButton.appendChild(backButtonText);
    backButton.setAttribute("href", "#");
    $(backButton).hide();   //hide initially, only display after calcButton was clicked

    var tilesDiv = null;

    $(calcButton).click(function(e){
        e.preventDefault();
        calculateSums();
        displayResults();
    });

    $(backButton).click(function(e){
        e.preventDefault();
        $("table").show();
        $(backButton).hide();
        $(calcButton).show();
        $(tilesDiv).remove();
    });

    /**
     * Store all cumulated values for all read currencies
     */
    var currencySums = {};

    /**
     * go through all commissions of the selected user and calculate cumulated values
     */
    function calculateSums(){
        var rows = $("table tr");
        console.dir(rows.length);
        
        currencySums = {};

        for(var i = 1; i < rows.length; i++){
            var currentRow = rows[i];
            var coin = currentRow.cells[1].innerText
            var userComission = currentRow.cells[5].innerText;
            var affiliateEarnings = currentRow.cells[2].innerText;
            
            var currencyValues = getOrCreateCoinSum(coin);
            currencyValues.sum = Big(currencyValues.sum).plus(Big(userComission)).toFixed(12).toString();
            currencyValues.count = Big(currencyValues.count).plus(1).toString();
            currencyValues.average = Big(currencyValues.sum).div(Big(currencyValues.count)).toFixed(12).toString();
            currencyValues.affiliateEarnings = Big(currencyValues.affiliateEarnings).plus(Big(affiliateEarnings)).toFixed(12).toString();
            currencySums[coin] = currencyValues;
        }
    }

    /**
     * Create a container div and add a tile for each currency inside it.
     * Finally hide the affiliate table and display the created tiles.
     */
    function displayResults(){
        tilesDiv = document.createElement('div');
        var tilesPosition = document.getElementsByClassName("card-holder")[0];
        tilesPosition.appendChild(tilesDiv);

        $("table").hide();
        $(calcButton).hide();
        $(backButton).show();
        Object.keys(currencySums).forEach(function(key,index) {
            // key: the name of the object key
            // index: the ordinal position of the key within the object 
            currencyValues = currencySums[key];
            var currencyTile = createTileForCoin(currencyValues);
            tilesDiv.appendChild(currencyTile);
        });
    }

    /**
     * Create a tile for a currency using a tamplate
     * @param {Object} coinValues 
     */
    function createTileForCoin(coinValues) {
        var div = document.createElement('div');
        div.setAttribute("class", "tile-stats col-lg-4 col-md-4");
        div.innerHTML = '<div class="icon"><img src="' + coinValues.imageUrl + '" style="width:60px;"></div><div class="count uppercase">' + coinValues.sum + ' ' + coinValues.name + '</div><p>Affiliate Earnings: ' + coinValues.affiliateEarnings + '</p><p>Average comission: ' + coinValues.average + '</p><p>Total Comissions: ' + coinValues.count + '</p>';
        return div; 
      }

    /**
     * Check whether there is already an object entry for the give coin,
     * if not, create a new one 
     * @param {String} coin 
     */
    function getOrCreateCoinSum(coin){
        if(currencySums[coin] === undefined){
            //coin must be created
            currencySums[coin] = {
                name: coin,
                sum: 0,
                count: 0,
                average: 0,
                affiliateEarnings: 0,
                imageUrl: "https://simplepospool.com/account/images/coins/" + coin + ".png"
            };
            //console.log("added coin ", coin);
        }
        return currencySums[coin];
    }

    var pageTitle = document.getElementsByClassName("x_title")[0];

    pageTitle.appendChild(calcButton);
    pageTitle.appendChild(backButton);
    console.log("Ran successfully!");
}