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
     * frue if there was at least one comission mismatch found
     */
    var comissionProblemsFound = false;

    /**
     * go through all commissions of the selected user and calculate cumulated values
     */
    function calculateSums(){
        var rows = $("table tr");
        
        currencySums = {};

        for(var i = 1; i < rows.length; i++){
            var currentRow = rows[i];
            var coin = currentRow.cells[1].innerText
            var stakeAmount = currentRow.cells[2].innerText;
            var percentage = currentRow.cells[3].innerText.match("([0-9]+)%")[1];
            var sppComission = currentRow.cells[4].innerText;
            var userComission = currentRow.cells[5].innerText.match("([0-9\.]+).*")[1];

            var expectedUserComission = calculateExpectedComission(stakeAmount, percentage);
            
            var currencyValues = getOrCreateCoinSum(coin);
            currencyValues.sum = Big(currencyValues.sum).plus(Big(userComission)).toFixed(12).toString();
            currencyValues.count = Big(currencyValues.count).plus(1).toString();
            currencyValues.expectedSum = Big(currencyValues.expectedSum).plus(Big(expectedUserComission)).toFixed(12).toString();
            currencyValues.average = Big(currencyValues.sum).div(Big(currencyValues.count)).toFixed(12).toString();
            currencyValues.affiliateEarnings = Big(currencyValues.affiliateEarnings).plus(Big(stakeAmount)).toFixed(12).toString();
            currencySums[coin] = currencyValues;
        }
    }

    /**
     * checks all comission values whether the comission was calculated correctly
     * If not a warning will be shown next to the comission
     */
    function checkCommissionCalculations(){
        var rows = $("table tr");
        
        for(var i = 1; i < rows.length; i++){
            var currentRow = rows[i];
            var coin = currentRow.cells[1].innerText
            var stakeAmount = currentRow.cells[2].innerText;
            var percentage = currentRow.cells[3].innerText.match("([0-9]+)%")[1];
            var sppComission = currentRow.cells[4].innerText;
            var userComission = currentRow.cells[5].innerText;

            var expectedUserComission = calculateExpectedComission(stakeAmount, percentage);

            if(expectedUserComission !== userComission){
                if(checkIfComissionDifferenceIsTooBig(expectedUserComission, userComission)){
                    comissionProblemsFound = true;
                    currentRow.cells[5].innerHTML = userComission + "<br/>" + "<div style='color:red;'>The above comission calculated by SPP is wrong.<br/>Correct value should be " + expectedUserComission + "</div>"
                }
            }
        }
    }

    function checkIfComissionDifferenceIsTooBig(expectedUserComission, userComission){
        var difference = Big(expectedUserComission).minus(Big(userComission)).toFixed(12).toString();
        if(Big(difference).gt(Big(0.00001)) || Big(difference).times(Big(-1)).gt(Big(0.00001))){
            return true;
        }
        return false;
    }

    function calculateExpectedComission(stakeAmount, percentage){
        var expectedUserComission = Big(stakeAmount).times(Big(0.03));
        expectedUserComission = expectedUserComission.times(Big(percentage).div(Big(100)))
            .round(10).toFixed(12).toString();
        return expectedUserComission;
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
        var warningLabel = "";
        if(checkIfComissionDifferenceIsTooBig(coinValues.expectedSum, coinValues.sum)){
            warningLabel = "<p style='color:red;'>This coin contains wrongly calculated comissions. Total difference because of wrong comissions: " 
                + Big(coinValues.expectedSum).minus(Big(coinValues.sum).toFixed(12).toString()) + "</p>";
        }
        div.innerHTML = '<div class="icon"><img src="' + coinValues.imageUrl + '" style="width:60px;"></div><div class="count uppercase">' + coinValues.sum + ' ' + coinValues.name + '</div><p>Affiliate Earnings: ' + coinValues.affiliateEarnings + '</p><p>Average comission: ' + coinValues.average + '</p><p>Total Comissions: ' + coinValues.count + '</p>' + warningLabel;
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
                expectedSum: 0,
                count: 0,
                average: 0,
                affiliateEarnings: 0,
                imageUrl: "https://simplepospool.com/account/images/coins/" + coin + ".png"
            };
            //console.log("added coin ", coin);
        }
        return currencySums[coin];
    }

    var btcPrice = 0;   //price for 1 BTC in USD
    var portfolioValueUsd = 0;
    var portfolioValueBtc = 0;
    function updateMissingPrices(){
        var tilePrices = $("#stats-slide div div p");

        //first run is to determine the price for BTC
        for(var i = 0; i < tilePrices.length; i++){
            var tilePrice = tilePrices[i].innerText;
            if(tilePrice.match("0\.00000000") === null){
                var prices = tilePrices[i].offsetParent.children[2].innerText;
                var parts = prices.split("/");
                var match = prices.match("([0-9\.]+).+([0-9]+\.[0-9]+).+");
                try{
                    var usd = parts[0].match("([0-9\.]+).+")[1];
                    var btc = parts[1].match(".([0-9\.]+).+")[1];

                    portfolioValueUsd = Big(portfolioValueUsd).plus(Big(usd)).toFixed(2).toString();
                    portfolioValueBtc = Big(portfolioValueBtc).plus(Big(btc)).toFixed(8).toString();

                    //calculate btc price only on first loop
                    if(btcPrice === 0){
                        var multiplicator = Big(1).div(Big(btc));
                        btcPrice = multiplicator.times(Big(usd)).toFixed(8).toString();
                    }
                }catch(error){
                    console.dir(error);
                }
            }
        }
        updateAndInsertPortfolioValue();

        //now loop through all tiles where the price is missing
        for(var i = 0; i < tilePrices.length; i++){
            var tilePrice = tilePrices[i].innerText;
            if(tilePrice.match("0\.00000000") !== null){
                var match = tilePrices[i].offsetParent.children[1].innerText.match("[0-9\.]+ ([A-Z0-9]+)");
                if(match !== null){
                    var coinName = match[1];
                    //console.log("no price found for ", coinName);
                    var lastPrice = loadAndUpdateCoinPriceFromCoinexchange(coinName, tilePrices[i]);
                }
            }
        }
    }

    /**
     * Inserts the HTML snippet containing the portfolio value into the website
     */
    function updateAndInsertPortfolioValue(){
        $(".portfolio").remove();
        var div = document.createElement('div');
        div.setAttribute("class", "text-center portfolio");
        div.setAttribute("style", "margin-top:10px;")
        div.innerHTML = '<div><strong>Portfolio Value</strong><br>' + portfolioValueUsd + ' USD<br>' + portfolioValueBtc + ' BTC</div>';

        var profilePic = document.getElementsByClassName("profile clearfix")[0];
        profilePic.appendChild(div);
    }

    /**
     * loads a the price for a coin from coinexchange in BTC
     */
    function loadAndUpdateCoinPriceFromCoinexchange(coin, tile){
        $.get("https://www.coinexchange.io/market/" + coin + "/BTC", function(response){
            var lastPrice = response.match("Last Price:.([0-9.]+).BTC")[1];
            //console.log("last price for ", coin, " is ", lastPrice);
            tile.offsetParent.children[3].innerHTML = "Last hour: " + lastPrice;

            var coinAmount = tile.offsetParent.children[1].innerText.match("([0-9\.,]+) [A-Z]+")[1];
            coinAmount = coinAmount.replace(/,/g, "")
            var coinValueBtc = Big(lastPrice).times(Big(coinAmount)).toFixed(8).toString();
            var coinValueUsd = Big(coinValueBtc).times(Big(btcPrice)).toFixed(2).toString();
            tile.offsetParent.children[2].innerHTML = coinValueUsd + " USD / " + coinValueBtc + " BTC";

            portfolioValueUsd = Big(portfolioValueUsd).plus(Big(coinValueUsd)).toFixed(2).toString();
            portfolioValueBtc = Big(portfolioValueBtc).plus(Big(coinValueBtc)).toFixed(8).toString();
            updateAndInsertPortfolioValue();
            return lastPrice;
        });
    }

    var pageTitle = document.getElementsByClassName("x_title")[0];

    if(window.location.toString().indexOf("report") !== -1){
        pageTitle.appendChild(calcButton);
        pageTitle.appendChild(backButton);
        checkCommissionCalculations();
    }

    updateMissingPrices();
    //console.log("Ran successfully!");
}