// @ts-check
function main() {
	const currentUrl = new URL(document.URL).pathname;
	const actionUrls = ["/properties", "/property-for-sale", "/houses-for-sale", "/flats-for-sale", "/new"];

	if (!actionUrls.some((url) => currentUrl.startsWith(url))) {
		console.debug("No action required");
		return;
	}

	updatePropertiesWithFloorArea(document.documentElement);

	const mainElement = document.getElementById("content");
	if (mainElement == null) {
		throw new Error("No main content element found");
	}

	const observer = new MutationObserver(mutations => updatePropertiesFromMutations(mutations));
	const obsConfig = { childList: true, subtree: true };
	observer.observe(mainElement, obsConfig);
}

/** Updates property elements based on a mutation list
 * @param {MutationRecord[]} mutationList
 */
function updatePropertiesFromMutations(mutationList) {
	for (const mutation of mutationList) {
		for (const addedNode of mutation.addedNodes) {
			if (addedNode.nodeType == Node.ELEMENT_NODE) {
				const addedElement = /** @type {Element} */(addedNode);
				console.debug(`Added: ${addedElement.outerHTML}`);
				updatePropertiesWithFloorArea(addedElement);
			}
		}
	}
}

/**
 * Updates all properties within an element with an extra icon showing floor area
 * @param {Element} parentElement - The parent element within which to update property elements.
 */
function updatePropertiesWithFloorArea(parentElement) {
	const propertyElements = parentElement.getElementsByClassName("propertyWrap");

	for (const element of propertyElements) {
		console.debug(`Updating: ${element.outerHTML}`)
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
		console.debug(`Skipping, url locked: ${url}`)
		return;
	}
	lockedElements.add(url);

	try {
		let infoDiv = element.getElementsByClassName("facilities")[0];
		const floorAreaSpinner = createFloorAreaElementWithSpinner();
		infoDiv.appendChild(floorAreaSpinner);

		const floorArea = await getFloorAreaFromPropertyPage(url);

		// The info div and floor area element need to be re-found/recreated because they may have been removed while awaiting the property page.
		const newFloorAreaElement = createFloorElementWithValue(floorArea);
		infoDiv = element.getElementsByClassName("facilities")[0];
		infoDiv.removeChild(floorAreaSpinner);
		infoDiv.appendChild(newFloorAreaElement);

		const stillExists = document.contains(element);
		console.debug(`Updated element for ${url}. Element still exists: ${stillExists}.`)

	} finally {
		lockedElements.delete(url);
	}
}

/**
 * Create a html element for the floor area with a spinner
 * Template: `<span class="opt added-floor-area"><span class="floor-area-spinner"></span><span class="icon-floor_area" style="margin-left:8px"></span></span>`
 * @returns {HTMLSpanElement} - The created element
 */
function createFloorAreaElementWithSpinner() {
	const mainElement = createBlankFloorAreaElement();

	const spinnerSpan = document.createElement("span");
	spinnerSpan.classList.add("floor-area-spinner");

	mainElement.insertAdjacentElement("afterbegin", spinnerSpan);

	return mainElement;
}

/**
 * Create a floor area element with the actual floor area value
 * @param {string} floorArea - The floor area to insert
 * @returns {HTMLSpanElement} - THe floor area element
 */
function createFloorElementWithValue(floorArea) {
	const element = createBlankFloorAreaElement();

	const spinnerSpan = element.getElementsByClassName("floor-area-spinner")[0];
	if (spinnerSpan) {
		element.removeChild(spinnerSpan);
	}

	element.insertAdjacentText("afterbegin", floorArea);
	return element;
}

/**
 * Create a new floor area element without a spinner or floor area value
 * @returns {HTMLSpanElement} - The created element
 */
function createBlankFloorAreaElement() {
	const mainSpan = document.createElement("span");
	mainSpan.classList.add("opt");
	mainSpan.classList.add("added-floor-area");

	const iconSpan = document.createElement("span");
	iconSpan.classList.add("icon-floor_area");
	iconSpan.style.marginLeft = "8px";

	mainSpan.appendChild(iconSpan);

	return mainSpan;
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
	const fullUrl = new URL(url, window.location.origin);
	const response = await fetch(fullUrl, { credentials: "omit", headers: [["espc-floor-area-extension", "true"]]}); 
	const html = await response.text();
	const doc = new DOMParser().parseFromString(html, "text/html");

	/** @type {HTMLElement | null } */
	const floorAreaElement = doc.querySelector(".icon-floor_area + strong");
	const floorAreaText = floorAreaElement?.innerText ?? "N/A";

	sessionStorage.setItem(key, floorAreaText);

	return floorAreaText;
}

main();
