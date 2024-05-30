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

    searchInput.addEventListener("input", filterItems);
    warehouse7Radio.addEventListener("change", filterItems);
    warehouseIncomeRadio.addEventListener("change", filterItems);
    weightRadio.addEventListener("change", filterItems);
    packagedRadio.addEventListener("change", filterItems);
    allRadio.addEventListener("change", filterItems);

    // Завантаження даних та фільтрація
    loadDataAndFilter();

    function loadDataAndFilter() {
        loadXMLData(filterItems, tableBody);
    }

    function filterItems() {
		var searchValue = searchInput.value.toLowerCase();
		var filterValue = document.querySelector('input[type="radio"]:checked').value;
		var showWarehouse7 = warehouse7Radio.checked;
		var showWarehouseIncome = warehouseIncomeRadio.checked;
		var showWeight = weightRadio.checked;
		var showPackaged = packagedRadio.checked;
		var showAll = allRadio.checked;

		var rows = tableBody.getElementsByTagName("tr");
		var displayedGroups = {};

		// Показуємо всі рядки товарів та груп
		for (var i = 0; i < rows.length; i++) {
			rows[i].style.display = ""; // Показуємо всі рядки
			var groupName = rows[i].getAttribute("data-group");
			displayedGroups[groupName] = false; // Ініціалізуємо всі групи як невідображені
		}

		// Фільтруємо товари
		for (var i = 0; i < rows.length; i++) {
			var itemName = rows[i].getElementsByTagName("td")[0]?.innerText.toLowerCase();
			var groupName = rows[i].getAttribute("data-group");

			if (itemName && !rows[i].classList.contains("group-row")) { // Перевіряємо, чи це не рядок групи
				var matchesSearch = itemName.includes(searchValue);
				var matchesFilter = (
					showAll ||
					(showWeight && isWeightGroup(groupName)) ||
					(showPackaged && isPackagedGroup(groupName))
				);

				var isInWarehouse7 = rows[i].classList.contains("warehouse-7");
				var isInWarehouseIncome = rows[i].classList.contains("warehouse-income");

				// Додаткова перевірка на відображення товару лише для надходжень
				var matchesIncomeFilter = !showWarehouseIncome || isInWarehouseIncome;

				var shouldDisplay = matchesSearch && matchesFilter &&
					((showWarehouse7 && isInWarehouse7) ||
					(showWarehouseIncome && isInWarehouseIncome));

				if (shouldDisplay && matchesIncomeFilter) { // Додано перевірку на відображення товару для надходжень
					rows[i].style.display = "";
					displayedGroups[groupName] = true; // Позначаємо групу як відображену

					// Встановлюємо data-expanded="true" для рядків групи
					if (rows[i].classList.contains("group-row")) {
						rows[i].setAttribute("data-expanded", "true");
					}
				} else {
					rows[i].style.display = "none";
				}
			}
		}

		// Приховуємо рядки груп, до яких не належить жоден видимий елемент
		var groupRows = tableBody.getElementsByClassName("group-row");
		for (var i = 0; i < groupRows.length; i++) {
			var groupName = groupRows[i].getAttribute("data-group");
			if (!displayedGroups[groupName]) {
				groupRows[i].style.display = "none";
			} else {
				groupRows[i].style.display = ""; // Показуємо групи, які містять хоча б один видимий елемент
			}
			// Зберігаємо стан розгорнутості групи
			if (groupRows[i].getAttribute("data-group") in groupStates) {
				displayedGroups[groupName] = groupStates[groupName];
			} else {
				groupStates[groupName] = true; // Зберігаємо значення за замовчуванням, якщо група ще не існує
			}
		}
	}
	
	
    // Функція для завантаження XML даних
    function loadXMLData(callback) { // Додаємо параметр callback
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
                    groupRow.setAttribute("data-group", groupName); // Додаємо атрибут data-group
					groupRow.setAttribute("data-expanded", "true"); // Додаємо цей атрибут
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

                        itemRow.classList.add("group-" + groupName.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "") + "-item", "product-row");
                        itemRow.setAttribute("data-group", groupName);
                        itemRow.style.display = "none";

                        tableBody.appendChild(itemRow);
                    }

                    // Показуємо рядок групи при завантаженні сторінки
                    groupRow.style.display = ""; // Додаємо цей рядок
                }

                if (callback) { // Викликаємо callback, якщо він переданий
                    callback();
                }
            }
        };
        xmlhttp.send();
    }

    function toggleGroupItems(groupRow) {
		var groupClass = groupRow.innerText.trim().substring(6).trim().toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");
		var groupItems = document.getElementsByClassName("group-" + groupClass + "-item");

		// Отримуємо поточний стан групи
		var groupName = groupRow.getAttribute("data-group");
		var isExpanded = groupStates[groupName];
		if (isExpanded === undefined) {
			isExpanded = true; // Встановлюємо значення за замовчуванням, якщо група ще не існує
		}

		// Виводимо поточний стан групи в консоль
		console.log("Group is expanded:", isExpanded);

		// Змінюємо стан групи та відображення її елементів
		var displayStyle = isExpanded ? "none" : "";

		for (var j = 0; j < groupItems.length; j++) {
			var item = groupItems[j];
			var groupName = item.getAttribute("data-group");
			var isInWarehouse7 = item.classList.contains("warehouse-7");
			var isInWarehouseIncome = item.classList.contains("warehouse-income");
			var showWarehouse7 = warehouse7Radio.checked;
			var showWarehouseIncome = warehouseIncomeRadio.checked;
			var showWeight = weightRadio.checked;
			var showPackaged = packagedRadio.checked;
			var showAll = allRadio.checked;

			var matchesFilter = (
				showAll ||
				(showWeight && isWeightGroup(groupName)) ||
				(showPackaged && isPackagedGroup(groupName))
			);

			var shouldDisplay = matchesFilter &&
				((showWarehouse7 && isInWarehouse7) ||
				(showWarehouseIncome && isInWarehouseIncome));

			// Застосовуємо стиль відображення до кожного елементу товару
			item.style.display = shouldDisplay ? displayStyle : "none";
		}

		// Оновлюємо стан групи
		groupStates[groupName] = !isExpanded;

		// Виводимо оновлений стан групи в консоль
		console.log("Group is now expanded:", !isExpanded);
	}
});