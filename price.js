var groupStates = {};

document.addEventListener("DOMContentLoaded", function () {
	var tableBody = document.getElementById("priceList").getElementsByTagName("tbody")[0];
	
	async function checkPassword() {
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('Orders.xml');
            const text = await response.text();

            const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
            const agents = xmlDoc.getElementsByTagName('Agent');

            let authenticated = Array.from(agents).some(agent => {
                const login = agent.getAttribute('Login');
                return login === password;
            });

            if (authenticated) {
                localStorage.setItem('authenticated', 'true');
                document.getElementById('password-container').style.display = 'none';
                document.getElementById('content').style.display = 'block';
            } else {
                alert('Невірний логін');
            }
        } catch (error) {
            console.error('Error loading or parsing XML:', error);
        }
    }
	
	function isWeightGroup(groupName) {
		var weightGroups = new Set([
			"Карамель,Ирис,Желейные(фа",
			"Карамель,Ирис,Желейные(вес)",
			"Конфеты весовые",
			"Конфеты весовые (фас)",
			"Специи"
		]);
		return weightGroups.has(groupName);
	}

	function isPackagedGroup(groupName) {
		var packagedGroups = new Set([
			"Батоны",
			"Бисквиты",
			"Вафли фасованные",
			"Конфеты коробочные",
			"Печенье,Крекер(фас)",
			"Шоколад"
		]);
		return packagedGroups.has(groupName);
	}

    // Код для обробки кліків на рядки груп
    var groupRows = document.querySelectorAll(".group-row");
    groupRows.forEach(function (groupRow) {
        groupRow.addEventListener("click", function () {
            toggleGroupItems(this);
        });
    });

    // Код для обробки фільтрації товарів
    var searchInput = document.getElementById("searchInput");
    var warehouse7Radio = document.getElementById("warehouse7Radio");
    var warehouseIncomeRadio = document.getElementById("warehouseIncomeRadio");
    var weightRadio = document.getElementById("weightRadio");
    var packagedRadio = document.getElementById("packagedRadio");
    var allRadio = document.getElementById("allRadio");
	var warehouseVIPRadio = document.getElementById("warehouseVIPRadio");

    searchInput.addEventListener("input", filterItems);
    warehouse7Radio.addEventListener("change", filterItems);
    warehouseIncomeRadio.addEventListener("change", filterItems);
    weightRadio.addEventListener("change", filterItems);
    packagedRadio.addEventListener("change", filterItems);
    allRadio.addEventListener("change", filterItems);
	warehouseVIPRadio.addEventListener("change", filterItems);

    // Завантаження даних та фільтрація
    loadDataAndFilter();

    function loadDataAndFilter() {
        loadXMLData(filterItems, tableBody);
    }

    function filterItems() {
		var searchValue = searchInput.value.toLowerCase();
		var showWarehouse7 = warehouse7Radio.checked;
		var showWarehouseIncome = warehouseIncomeRadio.checked;
		var showWarehouseVIP = warehouseVIPRadio.checked; // Додано
		var showWeight = weightRadio.checked;
		var showPackaged = packagedRadio.checked;
		var showAll = allRadio.checked;

		var rows = tableBody.getElementsByTagName("tr");
		var displayedGroups = {};

		for (var i = 0; i < rows.length; i++) {
			rows[i].style.display = ""; 
			var groupName = rows[i].getAttribute("data-group");
			displayedGroups[groupName] = false; 
		}

		for (var i = 0; i < rows.length; i++) {
			var itemName = rows[i].getElementsByTagName("td")[0]?.innerText.toLowerCase();
			var groupName = rows[i].getAttribute("data-group");

			if (itemName && !rows[i].classList.contains("group-row")) {
				var matchesSearch = itemName.includes(searchValue);
				var matchesFilter = (
					showAll ||
					(showWeight && isWeightGroup(groupName)) ||
					(showPackaged && isPackagedGroup(groupName))
				);

				var isInWarehouse7 = rows[i].classList.contains("warehouse-7");
				var isInWarehouseIncome = rows[i].classList.contains("warehouse-income");

				var shouldDisplay = matchesSearch && matchesFilter &&
					(
						(showWarehouse7 && isInWarehouse7 && !itemName.includes("акция вип")) ||
						(showWarehouseIncome && isInWarehouseIncome && !itemName.includes("акция вип")) ||
						(showWarehouseVIP && itemName.includes("акция вип"))
					);

				if (shouldDisplay) {
					rows[i].style.display = "";
					displayedGroups[groupName] = true; 
				} else {
					rows[i].style.display = "none";
				}
			}
		}

		var groupRows = tableBody.getElementsByClassName("group-row");
		for (var i = 0; i < groupRows.length; i++) {
			var groupName = groupRows[i].getAttribute("data-group");
			if (!displayedGroups[groupName]) {
				groupRows[i].style.display = "none";
			} else {
				groupRows[i].style.display = "";
			}
			if (groupRows[i].getAttribute("data-group") in groupStates) {
				displayedGroups[groupName] = groupStates[groupName];
			} else {
				groupStates[groupName] = true;
			}
		}
	}
	
	
    // Функція для завантаження XML даних
    function loadXMLData(callback) {
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET", "Price.xml", true);
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				var xmlDoc = xmlhttp.responseXML;
				var goods = xmlDoc.getElementsByTagName("Goods");
				var groupedItems = {};

				for (var i = 0; i < goods.length; i++) {
					var item = goods[i];
					var groupName = item.getAttribute("Group");

					if (!groupedItems[groupName]) {
						groupedItems[groupName] = [];
					}

					groupedItems[groupName].push(item);
				}

				var excludedGroups = new Set(["Побутові товари", "Архив", "Поддони"]);

				for (var groupName in groupedItems) {
					if (excludedGroups.has(groupName)) {
						continue;
					}

					var groupRow = document.createElement("tr");
					groupRow.innerHTML = "<td colspan='3'><b>Група " + groupName + "</b></td>";
					groupRow.classList.add("group-row");
					groupRow.setAttribute("data-group", groupName);
					groupRow.setAttribute("data-expanded", "true");
					tableBody.appendChild(groupRow);

					groupRow.addEventListener("click", function () {
						toggleGroupItems(this);
					});

					var items = groupedItems[groupName];
					for (var j = 0; j < items.length; j++) {
						var item = items[j];
						var itemName = item.getAttribute("Name");
						var itemPriceStr = item.getAttribute("Price");
						var itemPrice = parseFloat(itemPriceStr.replace(',', '.')) * 1.2;
						var formattedPrice = itemPrice.toFixed(2);
						var itemLeftover = item.getAttribute("Leftover");

						var itemRow = document.createElement("tr");
						itemRow.innerHTML = "<td>" + itemName + "</td><td>" + formattedPrice + "</td><td>" + itemLeftover + "</td>";

						var parentTagName = item.parentNode.tagName;
						var parentOfParentTagName = item.parentNode.parentNode.tagName;

						var skipRow = false;

						if (parentOfParentTagName === "Income") {
							itemRow.classList.add("warehouse-income");
						} else if (parentOfParentTagName === "Leftovers") {
							var warehouseName = item.parentNode.getAttribute("Name");
							if (warehouseName === "Склад Акция") {
								skipRow = true;
							} else {
								itemRow.classList.add("warehouse-7");
							}
						}

						if (skipRow) {
							continue;
						}

						if (itemName.includes("АКЦИЯ ВИП")) {
							itemRow.classList.add("warehouse-vip");
						}

						itemRow.classList.add("group-" + groupName.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "") + "-item", "product-row");
						itemRow.setAttribute("data-group", groupName);
						itemRow.style.display = "none";

						tableBody.appendChild(itemRow);
					}

					groupRow.style.display = "";
				}

				if (callback) {
					callback();
				}
			}
		};
		xmlhttp.send();
	}

    function toggleGroupItems(groupRow) {
		var groupClass = groupRow.innerText.trim().substring(6).trim().toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");
		var groupItems = document.getElementsByClassName("group-" + groupClass + "-item");

		var groupName = groupRow.getAttribute("data-group");
		var isExpanded = groupStates[groupName];
		if (isExpanded === undefined) {
			isExpanded = true;
		}

		console.log("Group is expanded:", isExpanded);

		var displayStyle = isExpanded ? "none" : "";

		for (var j = 0; j < groupItems.length; j++) {
			var item = groupItems[j];
			var groupName = item.getAttribute("data-group");
			var isInWarehouse7 = item.classList.contains("warehouse-7");
			var isInWarehouseIncome = item.classList.contains("warehouse-income");
			var isInWarehouseVIP = item.classList.contains("warehouse-vip");
			var showWarehouse7 = warehouse7Radio.checked;
			var showWarehouseIncome = warehouseIncomeRadio.checked;
			var showWarehouseVIP = warehouseVIPRadio.checked;
			var showWeight = weightRadio.checked;
			var showPackaged = packagedRadio.checked;
			var showAll = allRadio.checked;

			var matchesFilter = (
				showAll ||
				(showWeight && isWeightGroup(groupName)) ||
				(showPackaged && isPackagedGroup(groupName))
			);

			var shouldDisplay = matchesFilter &&
				(
					(showWarehouse7 && isInWarehouse7 && !item.innerText.toLowerCase().includes("акция вип")) ||
					(showWarehouseIncome && isInWarehouseIncome && !item.innerText.toLowerCase().includes("акция вип")) ||
					(showWarehouseVIP && isInWarehouseVIP)
				);

			item.style.display = shouldDisplay ? displayStyle : "none";
		}

		groupStates[groupName] = !isExpanded;
		console.log("Group is now expanded:", !isExpanded);
	}
});