// @ts-check
async function main() {
	const currentUrl = new URL(document.URL).pathname;

	console.debug(currentUrl);

	const actionUrls = ["/properties", "/property-for-sale", "/houses-for-sale", "/flats-for-sale"];

	if (!actionUrls.some((url) => currentUrl.startsWith(url))) {
		console.debug("No action required");
		return;
	}

	await updatePropertiesWithFloorArea();

	const mainElement = document.getElementById("content");
	if (mainElement == null) {
		throw new Error("No main content element found");
	}

	const observer = new MutationObserver(async() => await updatePropertiesWithFloorArea());
	const obsConfig = { childList: true, subtree: true };
	observer.observe(mainElement, obsConfig);
}

/**
 * Updates all properties with an extra icon showing floor area
 */
async function updatePropertiesWithFloorArea() {
	const propertyElements = document.getElementsByClassName("propertyWrap");

	const promises = [];
	for (const element of propertyElements) {
		promises.push(updatePropertyWithFloorArea(element));
	}

	await Promise.all(promises);
}

/** Update a single property element with an icon showing floor area
 * @param {Element} element - The property Element to update
 */
async function updatePropertyWithFloorArea(element) {
	let alreadyAdded = element.querySelector(".added-floor-area");
	if (alreadyAdded) { return; }

	/** @type {HTMLAnchorElement | null} */
	const aElement = element.querySelector(".infoWrap > a");
	const url = aElement?.href;
	if (url == null) {
		console.debug("No url found");
		return;
	}

	const floorArea = await getFloorAreaFromPropertyPage(new URL(url));
	if (!floorArea) {
		console.debug("No floor area found");
		return;
	}

	const infoDiv = element.getElementsByClassName("facilities")[0];
	const newFloorAreaHtml = `<span class="opt added-floor-area">${floorArea}<span class="icon-floor_area" style="margin-left:8px"></span></span>`;
	const floorAreaElement = createElementFromHtml(newFloorAreaHtml);
	if (floorAreaElement == null) {
		console.warn(`Invalid html string ${newFloorAreaHtml}`);
		return;
	}

	alreadyAdded = element.querySelector(".added-floor-area"); // Check again in case this element is being updated by multiple threads.
	if (alreadyAdded) { return; }

	console.debug("Adding floor area to element");
	infoDiv.appendChild(floorAreaElement);
}

/**
 * Fetches the property floor area from the given url.
 * @param {URL} url - The url of the property page.
 * @returns {Promise<string>}
 */
async function getFloorAreaFromPropertyPage(url) {
	const fromCache = sessionStorage.getItem(url.pathname);
	if (fromCache) {
		console.debug("Fetched floor area from cache");
		return fromCache;
	}

	const response = await fetch(url.toString());
	const html = await response.text();
	const doc = new DOMParser().parseFromString(html, "text/html");

	/** @type {HTMLElement | null } */
	const floorAreaElement = doc.querySelector(".icon-floor_area + strong");
	const floorAreaText = floorAreaElement?.innerText ?? "N/A";

	sessionStorage.setItem(url.pathname, floorAreaText);

	return floorAreaText;
}

/**
 * Takes a HTML string and converts it into a HTMLElement
 * @param {string} htmlString - The HTML string to parse.
 * @returns {Element | null}
 */
function createElementFromHtml(htmlString) {
	const template = document.createElement("template");
	template.innerHTML = htmlString.trim();
	return template.content.firstElementChild;
}

main();
