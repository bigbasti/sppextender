window.onload = function(){ 
    var calcButton = document.createElement("a");
    var calcButtonText = document.createTextNode("Calculate Sums For this Affiliate");
    calcButton.appendChild(calcButtonText);
    calcButton.setAttribute("href", "#");
    calcButton.setAttribute("class", "btn btn-default");
    
    var backButton = document.createElement("a");
    var backButtonText = document.createTextNode("Back to table view");
    backButton.appendChild(backButtonText);
    backButton.setAttribute("href", "#");
    backButton.setAttribute("class", "btn btn-default");
    $(backButton).hide();   //hide initially, only display after calcButton was clicked

    var createChartButton = document.createElement("a");
    var createChartButtonText = document.createTextNode("Calculate Affiliate Overview (BETA)");
    createChartButton.appendChild(createChartButtonText);
    createChartButton.setAttribute("href", "#");
    createChartButton.setAttribute("class", "btn btn-default");

    var tilesDiv = null;
    var alliliateChartDiv = null;

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

    $(createChartButton).click(function(e){
        e.preventDefault();
        $(createChartButton).hide();
        createHistory();
    });

    /**
     * define which exchange to use for which coin
     */
    var coinExchanges = {
        "DVRS": loadAndUpdateCoinPriceFromCoinexchange,
        "KB3": loadAndUpdateCoinPriceFromCoinexchange,
        "LAMBO": loadAndUpdateCoinPriceFromCoinexchange,
        "NMD": loadAndUpdateCoinPriceFromCoinexchange,
        "EXTN": loadAndUpdateCoinPriceFromCoinexchange,
        "BWS": loadAndUpdateCoinPriceFromCoinlib,
        "VARIUS": loadAndUpdateCoinPriceFromCoinlib,
        "VTAR": loadAndUpdateCoinPriceFromCoinlib,
        "CROP": loadAndUpdateCoinPriceFromCoinlib,
        "SPD": loadAndUpdateCoinPriceFromCoinlib,
        "ROE": loadAndUpdateCoinPriceFromCoinlib,
        "OLMP": loadAndUpdateCoinPriceFromCoinlib,
        "CBS": loadAndUpdateCoinPriceFromCoinlib
    }

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
                    //console.dir(error);
                }
            }
        }
        updateAndInsertPortfolioValue();

        //now loop through all tiles where the price is missing
        for(var i = 0; i < tilePrices.length; i++){
            var tilePrice = tilePrices[i].innerText;
            if(tilePrice.match("0\.00000000") !== null){
                try{
                    var priceIndex = 1;     //staked coin
                    if(tilePrices[i].offsetParent.children.length === 5){ 
                        priceIndex = 2;     //masternode
                    }
                    var match = tilePrices[i].offsetParent.children[priceIndex].innerText.match("[0-9\.]+ ([A-Z0-9]+)");
                    if(match !== null){
                        var coinName = match[1];
                        //console.log("no price found for ", coinName);
                        var lastPrice = coinExchanges[coinName](coinName, tilePrices[i]);
                    }
                }catch(error){
                    //console.dir(error);
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

    /**
     * loads a the price for a coin from coinlib in BTC
     */
    function loadAndUpdateCoinPriceFromCoinlib(coin, tile){
        $.get("https://coinlib.io/coin/" + coin + "/", function(response){
            //coinlib.io behaves somewhat strage so maybe more than one try is required
            var priceMatch = response.match("&#3647;&nbsp;([0-9.]+)");
            if(priceMatch === null){
                priceMatch = response.match("coin-price.*BTC ([0-9.]+)");
            }
            if(priceMatch === null){
                //something wrong
                console.log("PLEASE SEND THE FOLLOWING LOG MESSAGE COMPLETELY TO THE DEVELOPER TO RESOLVE THE ERROR:");
                console.dir(priceMatch);
            }

            var lastPrice = priceMatch[1];
            //console.log("last price for ", coin, " is ", lastPrice);
            if(tile.offsetParent.children[0].innerHTML.match("Masternode") === null){
                tile.offsetParent.children[3].innerHTML = "Last hour: " + lastPrice;
            }else{
                tile.offsetParent.children[4].innerHTML = "Last hour: " + lastPrice;
            }
            

            var priceIndex = 1;     //staked coin
            if(tile.offsetParent.children.length === 5){ 
                priceIndex = 2;     //masternode
            }
            var coinAmount = tile.offsetParent.children[priceIndex].innerText.match("([0-9\.,]+) [A-Z]+")[1];
            coinAmount = coinAmount.replace(/,/g, "")
            var coinValueBtc = Big(lastPrice).times(Big(coinAmount)).toFixed(8).toString();
            var coinValueUsd = Big(coinValueBtc).times(Big(btcPrice)).toFixed(2).toString();
            tile.offsetParent.children[priceIndex+1].innerHTML = coinValueUsd + " USD / " + coinValueBtc + " BTC";

            portfolioValueUsd = Big(portfolioValueUsd).plus(Big(coinValueUsd)).toFixed(2).toString();
            portfolioValueBtc = Big(portfolioValueBtc).plus(Big(coinValueBtc)).toFixed(8).toString();
            updateAndInsertPortfolioValue();
            return lastPrice;
        });
    }

    var referralCoins = {};
    var coinHistoryData = {};
    var refferals = 0;
    var refsLoaded = 0;
    function getOrCreateCoinForHistory(coin){
        if(coinHistoryData[coin] === undefined){
            //coin must be created
            coinHistoryData[coin] = {
                name: coin,
                sum: 0,
                count: 0,
                average: 0,
                affiliateEarnings: 0,
                users: [],
                imageUrl: "https://simplepospool.com/account/images/coins/" + coin + ".png",
                history: [] //{date: moment, amount: big, username: string}
            };
            //console.log("added coin ", coin);
        }
        return coinHistoryData[coin];
    }
    function addCoinToReferral(username, coin, icon){
        if(referralCoins[username] === undefined){
            //create new entry
            referralCoins[username] = {
                coins: []   //{name: coin, icon: url}
            }
        }
        if($.inArray(icon, referralCoins[username].coins) < 0){
            referralCoins[username].coins.push(icon);
        }
    }

    var affiliateTableRows = [];
    function createHistory(){
        var rows = $("table tr");
        var urlsToLoad = [];
        
        //extract all affiliate urls from overview
        for(var i = 1; i < rows.length; i++){
            var currentRow = rows[i];
            if(currentRow.cells.length > 1){    //ignore level separators  
                var refUri = currentRow.attributes[0].textContent;
                urlsToLoad.push(refUri);
                affiliateTableRows.push(currentRow);
            }
        }
        refferals = urlsToLoad.length;

        //load the affiliate sites and extract data
        loadAndProcessNextHistoryBatch(0, urlsToLoad);

        //google.charts.load('current', {packages: ['corechart']});
        //google.charts.setOnLoadCallback(drawChart);
    }

    function loadAndProcessNextHistoryBatch(startFrom, urlsToLoad){
        if(startFrom < urlsToLoad.length){
            $.get("https://simplepospool.com/account/" + urlsToLoad[startFrom], function(response){

                var usernameRegex = "<h2>Details about ([a-zA-Z0-9\._-]+)</h2>";
                var regexTrSplit = "<tr><td>([ :0-9-]+)</td><td>([0-9a-zA-Z]+)</td><td>([0-9\.A-Z-]+)</td><td>([0-9%]+)</td><td>([0-9\.A-Z-]+)</td><td>([0-9\.A-Z-]+)</td></tr>";
                
                var affiliateUserName = "";
                try{
                    affiliateUserName = response.match(usernameRegex)[1];
                }catch(error){
                    console.log("could not read username for", urlsToLoad[startFrom]);
                }

                var regex = new RegExp(regexTrSplit, 'g');
                var match;
                while(match = regex.exec(response)) {
                    //var match = response.match(regexTrSplit);
                    try{
                        var date = moment(match[1]);
                        var coin = match[2];
                        var stake = match[3];
                        var percentage = match[4];
                        var sppComission = match[5];
                        var userComission = match[6];

                        var coinHistory = getOrCreateCoinForHistory(coin);
                        if($.inArray(affiliateUserName, coinHistory.users) < 0){
                            coinHistory.users.push(affiliateUserName);
                        }
                        coinHistory.sum = Big(coinHistory.sum).plus(Big(userComission)).toFixed(12).toString();
                        coinHistory.count = Big(coinHistory.count).plus(1).toString();
                        coinHistory.average = Big(coinHistory.sum).div(Big(coinHistory.count)).toFixed(12).toString();
                        coinHistory.affiliateEarnings = Big(coinHistory.affiliateEarnings).plus(Big(stake)).toFixed(12).toString();
                        coinHistory.history.push({date: date, amount: userComission, username: affiliateUserName, affAddress: urlsToLoad[startFrom]});
                        coinHistoryData[coin] = coinHistory;

                        addCoinToReferral(affiliateUserName, coin, coinHistory.imageUrl);
                    }catch(exception){
                        console.dir(exception);
                    }
                }
                
                //console.log(urlsToLoad[startFrom], " finished!");
                refsLoaded = startFrom;
                updateCoinHitroyDisplay();
                loadAndProcessNextHistoryBatch(startFrom+1, urlsToLoad);
            });
        }else{
            //all urls loaded
            $(".ref-loading").remove();
            $(".sums-for-chart").remove();
            console.log("All refs loaded");
            createAndDisplayRefTable();
            displayCoinsperReferrer();
        }
    }

    function updateCoinHitroyDisplay(){
        $(".sums-for-chart").remove();
        var div = document.createElement('div');
        div.setAttribute("class", "sums-for-chart");
        div.setAttribute("style", "margin-top:10px;")

        contentText = "";
        var percentLoaded = 0;
        var progressbar = '<div class="progress ref-loading"><div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="_progress_" aria-valuemin="0" aria-valuemax="100" style="width: _progress_%"><span class="sr-only">_progress_% Complete</span></div></div>';
        Object.keys(coinHistoryData).forEach(function(key,index) {
            // key: the name of the object key
            // index: the ordinal position of the key within the object 
            percentLoaded = Big(refsLoaded).div(Big(refferals)).times(Big(100)).toFixed(0).toString();
            currencyValues = coinHistoryData[key];
            contentText = contentText + "<br/><strong>" + currencyValues.name + ":</strong>&nbsp;" + currencyValues.sum;
        });
        progressbar = progressbar.replace(/_progress_/g , percentLoaded);
        div.innerHTML = '<div>' + progressbar + '<p/>' + contentText + '</div>';
        pageTitle.appendChild(div);
    }

    function createAndDisplayRefTable(){
        $(".referral-table-sums").remove();
        var div = document.createElement('div');
        div.setAttribute("class", "referral-table-sums");
        div.setAttribute("style", "margin-top:10px;")

        var table_head = "<table class='ref-overview-table table table-striped'><thead><th>&nbsp;</th><th>Coin</th><th>Earned Amount</th><th>From # users</th></thead><tbody>";
        var table_content = "";
        var table_footer = "</tbody></table>";
        Object.keys(coinHistoryData).forEach(function(key,index) {
            // key: the name of the object key
            // index: the ordinal position of the key within the object 
            currencyValues = coinHistoryData[key];
            table_content = table_content + '<tr><td><img src="' + currencyValues.imageUrl + 
                '" style="width:32px;"></td><td>' + currencyValues.name + 
                '</td><td>' + currencyValues.sum + '</td><td>' + currencyValues.users.length + '</td></tr>';
        });
        div.innerHTML = '<div>' + table_head + table_content + table_footer + '</div>';
        pageTitle.appendChild(div);
        $(".ref-overview-table").DataTable();
    }

    function displayCoinsperReferrer(){
        for(var i = 0; i < affiliateTableRows.length; i ++){
            var currentRow = affiliateTableRows[i];
            try {
                var username = currentRow.cells[0].innerHTML.match("#[0-9]+ ([a-zA-Z0-9\._-]+)")[1];
                var html = username + "<br/>";
                for(var j = 0; j < referralCoins[username].coins.length; j++){
                    var currentCoin = referralCoins[username].coins[j];
                    html = html + '<img src="' + currentCoin + '" style="width:24px;">';
                }
                currentRow.cells[0].innerHTML = html;
            }catch(error){
                //console.log("error for", currentRow);
                //console.dir(error);
            }
        }
    }

    var pageTitle = document.getElementsByClassName("x_title")[0];

    if(window.location.toString().indexOf("affiliates") !== -1){
        pageTitle.appendChild(createChartButton);
    }

    if(window.location.toString().indexOf("report") !== -1){
        pageTitle.appendChild(calcButton);
        pageTitle.appendChild(backButton);
        checkCommissionCalculations();
    }

    updateMissingPrices();
    console.log("SPP Extender Ran successfully!");
}