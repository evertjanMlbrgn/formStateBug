// I created this file to test a possible bug in Chromium based browsers
// codepen:

let style = `
    :host {
      display:block;
    }
    `;

let formStateTemplate = `
            <style>
                ${style}
            </style>
            <h1>FormStateRestoreCallback not called with some "File" objects</h1>
            <canvas id="canvas" width="500" height="500"></canvas>
            <h2>Working scenario</h2>
            <p>1. Append file(s) from a file input to a FormData object.</p>
            <p>2. Call elementInternals.setFormValue() with said FormData object.</p>
            <input type="file" id="fileUpload">
            <p>Instructions: Select a file above, navigate back and forward again and see the results in the console.</p>
            <h2>Working scenario</h2>
            <p>1. Append a simple string to a FormData object.</p>
            <p>2. Call elementInternals.setFormValue() with said FormData object.</p>
            <button id="stringValue">elementInternals.setFormValue with string</button>
            <p>Instructions: Press the button above, navigate back and forward again and see the results in the console.</p>
            <h2>Non working scenario</h2>
            <p>1. Append a file retrieved from the canvas above to a FormData object.</p>
            <p>2. Call elementInternals.setFormValue() with said FormData object.</p>
            <button id="fileFromCanvas">elementInternals.setFormValue with file from canvas</button>
            <p>Instructions: Press the button above, navigate back and forward again and see the results in the console.</p>
            <h3>Findings:</h3>
            <ul>
            <li>formStateRestoreCallback is not called in Chromium based browsers.</li>
            <li>formStateRestoreCallback is not called in Chromium based browsers, even not when there are other values present in the FormData object.</li>
            <li>formStateRestoreCallback is called in Firefox and with correct file.</li>
            </ul>
            `;

class FormStateComponent extends HTMLElement {

    static formAssociated = true;
    #canvas;
    #internals;

    constructor() {
        super();

        this.attachShadow({
            mode: 'open',
        });
        this.#internals = this.attachInternals();// attachInternals gives access to extra properties and methods
        this.#appendHtmlTemplate();

        // canvas
        this.#canvas = this.shadowRoot.querySelector('#canvas');
        this.drawImageOnCanvas();

        // add event listeners
        this.shadowRoot.querySelector('#fileUpload').addEventListener('change', (e) => {
            let files = e.target.files;
            this.setFormValueUsingFileUpload(files);
        })
        this.shadowRoot.querySelector('#stringValue').addEventListener('click', () => {
            this.setFormValueUsingSimpleString();
        })
        this.shadowRoot.querySelector('#fileFromCanvas').addEventListener('click', () => {
            this.setFormValueUsingFileRetrievedFromCanvas();
        })

    };

    #appendHtmlTemplate() {
        const template = document.createElement('template');
        template.innerHTML = formStateTemplate;
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    async getFileFromUrl(url, fileName) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const mimeType = response.headers.get('content-type');
            const file = new File([blob], fileName, {type: mimeType});
            success(file);
        } catch (error) {
            console.warn(`getFileFromUrl: could not get file: ${error}`);
        }
    }

    async canvasToFile(canvas) {
        return await this.getFileFromUrl(canvas.toDataURL('image/png', 1), 'testfile.png');
    }

    drawImageOnCanvas() {
        const canvas = this.#canvas;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
        };
        img.src = 'testImage.jpeg';
    }

    formStateRestoreCallback(state, mode) {
        console.log('formStateRestoreCallback called. State', state, 'Mode', mode);
        let formData = state;
        // console.log('state contents:', Object.fromEntries(state));
        let formDataObject = {};
        formData.forEach((value, key) => {
            formDataObject[key] = value;
        });
        console.log('FormData contents as an object', formDataObject);
    }

    setFormValueUsingFileUpload(files) {
        console.log('setFormValue using FormData object with a File object appended from the file upload input.')
        let formData = new FormData();
        for (let file of files) {
            formData.append('fileValue', file);
        }
        this.#internals.setFormValue(formData);
    }

    setFormValueUsingSimpleString() {
        console.log('setFormValue using FormData object with a simple string.')
        let formData = new FormData();
        formData.append('string', 'Just a simple string');
        this.#internals.setFormValue(formData);
    }

    async setFormValueUsingFileRetrievedFromCanvas() {
        console.log('setFormValue using FormData object with a File object retrieved from canvas.')

        let file = await this.canvasToFile(this.#canvas);
        let formData = new FormData();
        formData.append('fileValue', file);
        formData.append('string', 'Just a simple string to demonstrate that formStateRestoreCallback is not called at all, even when other values are present that would normally trigger it');

        this.#internals.setFormValue(formData);
    }
}

customElements.define('form-state', FormStateComponent);
