main();

async function main() {
	const currentUrl = new URL(document.URL).pathname;

	console.log(currentUrl);

	const validUrls = ["/properties", "/property-for-sale"];

	if (!validUrls.some((url) => currentUrl.startsWith(url))) {
		console.log("No action required");
		return;
	}

	await updatePropertiesWithFloorArea();

	const mainElement = document.getElementById("content");
	const observer = new MutationObserver(async() => await updatePropertiesWithFloorArea());
	const obsConfig = { childList: true, subtree: true };
	observer.observe(mainElement, obsConfig);
}

/**
 * Updates all properties with an extra icon showing floor area
 */
async function updatePropertiesWithFloorArea() {
	const propertyElements = document.getElementsByClassName("propertyWrap");

	for (const element of propertyElements) {
		const alreadyAdded = element.querySelector(".added-floor-area");
		if (alreadyAdded) { return; }

		const url = element.querySelector(".infoWrap > a")?.href;
		if (!url) {
			console.log("No url found");
			continue;
		}

		const floorArea = await getFloorAreaFromPropertyPage(url);		

		const infoDiv = element.getElementsByClassName("facilities")[0];
		const newFloorAreaHtml = `<span class="opt added-floor-area">${floorArea}<span class="icon-floor_area" style="margin-left:8px"></span></span>`;
		const floorAreaElement = createElementFromHtml(newFloorAreaHtml);

		console.log("Adding floor area to element");
		infoDiv.appendChild(floorAreaElement);
	}
}

/**
 * Fetches the property floor area from the given url.
 * @param {string} url - The url of the property page.
 * @returns {Promise<string>}
 */
async function getFloorAreaFromPropertyPage(url) {
	return "50m";
}

/**
 * Takes a HTML string and converts it into a HTMLElement
 * @param {string} htmlString - The HTML string to parse.
 * @returns {HTMLElement}
 */
function createElementFromHtml(htmlString) {
	const temp = document.createElement("div");
	temp.innerHTML = htmlString.trim();
	return temp.firstElementChild;
}
