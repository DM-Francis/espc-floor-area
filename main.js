// @ts-check
function main() {
	const currentUrl = new URL(document.URL).pathname;
	const actionUrls = ["/properties", "/property-for-sale", "/houses-for-sale", "/flats-for-sale"];

	if (!actionUrls.some((url) => currentUrl.startsWith(url))) {
		console.debug("No action required");
		return;
	}

	updatePropertiesWithFloorArea();

	const mainElement = document.getElementById("content");
	if (mainElement == null) {
		throw new Error("No main content element found");
	}

	const observer = new MutationObserver(() => updatePropertiesWithFloorArea());
	const obsConfig = { childList: true, subtree: true };
	observer.observe(mainElement, obsConfig);
}

/**
 * Updates all properties with an extra icon showing floor area
 */
function updatePropertiesWithFloorArea() {
	const propertyElements = document.getElementsByClassName("propertyWrap");

	for (const element of propertyElements) {
		updatePropertyWithFloorArea(element); // Note we are not awaiting any of these updates, they will all run on the event loop in the background
	}
}

// A global Set to keep track of which elements are being updated - keyed on url
const lockedElements = new Set();

/** Update a single property element with an icon showing floor area
 * @param {Element} element - The property Element to update
 */
async function updatePropertyWithFloorArea(element) {
	let alreadyAdded = element.querySelector(".added-floor-area");
	if (alreadyAdded) { return; }

	const url = getUrlFromPropertyElement(element);
	if (url == null) {
		return;
	}

	// Ensure only 1 'thread' can update this property element at a time
	if (lockedElements.has(url)) {
		return;
	}
	lockedElements.add(url);

	const floorArea = await getFloorAreaFromPropertyPage(url);

	const infoDiv = element.getElementsByClassName("facilities")[0];
	const newFloorAreaHtml = `<span class="opt added-floor-area">${floorArea}<span class="icon-floor_area" style="margin-left:8px"></span></span>`;
	const floorAreaElement = createElementFromHtml(newFloorAreaHtml);
	if (floorAreaElement == null) {
		console.warn(`Invalid html string ${newFloorAreaHtml}`);
		lockedElements.delete(url);
		return;
	}

	infoDiv.appendChild(floorAreaElement);
	lockedElements.delete(url);
}

/**
 * Gets the url to the property page from a html element.
 * @param {Element} element 
 * @returns {string | null} - The url to the property page
 */
function getUrlFromPropertyElement(element) {
	/** @type {HTMLAnchorElement | null} */
	const aElement = element.querySelector(".infoWrap > a");
	const rawUrl = aElement?.href;
	if (rawUrl == null) {
		return null;
	}

	return new URL(rawUrl).pathname;
}

/**
 * Fetches the property floor area from the given url.
 * @param {string} url - The url of the property page.
 * @returns {Promise<string>}
 */
async function getFloorAreaFromPropertyPage(url) {
	const key = `floorarea-${url}`;
	const fromCache = sessionStorage.getItem(key);
	if (fromCache != null) {
		return fromCache;
	}

	// Add a custom header to identify that this traffic comes from the extension
	const response = await fetch(url, { credentials: "omit", headers: [["espc-floor-area-extension", "true"]]}); 
	const html = await response.text();
	const doc = new DOMParser().parseFromString(html, "text/html");

	/** @type {HTMLElement | null } */
	const floorAreaElement = doc.querySelector(".icon-floor_area + strong");
	const floorAreaText = floorAreaElement?.innerText ?? "N/A";

	sessionStorage.setItem(key, floorAreaText);

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