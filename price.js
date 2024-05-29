document.addEventListener("DOMContentLoaded", function() {
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

    // Отримуємо посилання на таблицю та елементи сторінки
    var priceListTable = document.getElementById("priceList");
    var tableBody = priceListTable.getElementsByTagName("tbody")[0];
    var searchInput = document.getElementById("searchInput");
    var warehouse7Radio = document.getElementById("warehouse7Radio");
    var warehouseIncomeRadio = document.getElementById("warehouseIncomeRadio");
    var weightRadio = document.getElementById("weightRadio");
    var packagedRadio = document.getElementById("packagedRadio");
    var allRadio = document.getElementById("allRadio");

    // Додаємо події для введення тексту у стрічку пошуку та зміни фільтра
    searchInput.addEventListener("input", filterItems);
    warehouse7Radio.addEventListener("change", filterItems);
    warehouseIncomeRadio.addEventListener("change", filterItems);
    weightRadio.addEventListener("change", filterItems);
    packagedRadio.addEventListener("change", filterItems);
    allRadio.addEventListener("change", filterItems);

    // Завантажуємо дані та фільтруємо їх при завантаженні сторінки
    loadDataAndFilter();

    // Функція для завантаження даних та фільтрації
    function loadDataAndFilter() {
        loadXMLData();
        filterItems();
    }

    // Функція для фільтрації товарів
    function filterItems() {
        var searchValue = searchInput.value.toLowerCase();
        var filterValue = document.querySelector('input[type="radio"]:checked').value;
        var showWarehouse7 = warehouse7Radio.checked;
        var showWarehouseIncome = warehouseIncomeRadio.checked;
        var showWeight = weightRadio.checked;
        var showPackaged = packagedRadio.checked;
        var showAll = allRadio.checked;

        var rows = tableBody.getElementsByTagName("tr");

        for (var i = 0; i < rows.length; i++) {
            var itemName = rows[i].getElementsByTagName("td")[0]?.innerText.toLowerCase();
            var groupName = rows[i].getAttribute("data-group");

            if (itemName) {
                var matchesSearch = itemName.includes(searchValue);
                var matchesFilter = (showAll ||
                    (showWeight && isWeightGroup(groupName)) ||
                    (showPackaged && isPackagedGroup(groupName))
                );

                var isInWarehouse7 = rows[i].classList.contains("warehouse-7");
                var isInWarehouseIncome = rows[i].classList.contains("warehouse-income");

                var shouldDisplay = matchesSearch && matchesFilter &&
                    ((showWarehouse7 && isInWarehouse7) ||
                    (showWarehouseIncome && isInWarehouseIncome));

                if (shouldDisplay) {
                    rows[i].style.display = "";
                } else {
                    rows[i].style.display = "none";
                }
            }
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

    function loadXMLData() {
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET", "Price.xml", true);
		xmlhttp.onreadystatechange = function() {
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
					tableBody.appendChild(groupRow);

					groupRow.addEventListener("click", function() {
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

						itemRow.classList.add("group-" + groupName.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "") + "-item", "product-row");
						itemRow.setAttribute("data-group", groupName);
						itemRow.style.display = "none";

						tableBody.appendChild(itemRow);
					}
				}
			}
		};
		xmlhttp.send();
	}

    function toggleGroupItems(groupRow) {
        var groupClass = groupRow.innerText.trim().substring(6).trim().toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");

        var groupItems = document.getElementsByClassName("group-" + groupClass + "-item");

        var anyHidden = false;
        for (var i = 0; i < groupItems.length; i++) {
            if (groupItems[i].style.display === "none") {
                anyHidden = true;
                break;
            }
        }

        for (var j = 0; j < groupItems.length; j++) {
            groupItems[j].style.display = anyHidden ? "" : "none";
        }
    }     	
});