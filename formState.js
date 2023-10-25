// I created this file to test a possible bug in Chromium based browsers
// codepen:

let style = `
    :host {
      display:block;
    }
    .main {
        margin-bottom:1em;
    }
    .content {
        display:flex;
        gap:1em;
    }
    .left-container {
        display:flex;
        flex-direction:column;
        gap:1em;
        justify-content:start;
        align-items:start;
    }
    .scenarios {
        height:500px;
        overflow:hidden;
        overflow-y:auto;
    }
    .console-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
    .console {
        height:300px;
        width:800px;
        border:1px dotted black;
        overflow:hidden;
        overflow-y:auto;
    }
    .console__message {
        background-color:#ccc;
        padding:0.5em;
    }
    #info {
        background-color: #ccc;
        padding:0.5em;
    }
    `;

let formStateTemplate = `
            <style>
                ${style}
            </style>
            <main class="main">
                <div class="header">
                    <h1>FormStateRestoreCallback not called in Chromium based browsers</h1>
                </div>
                <div class="content">
                    <div class="left-container">
                        <div class="console-wrapper">
                            <span>Messages <strong>(see console in developer tools for more accurate / complete details)</strong></span>
                            <div id="console" class="console"></div>
                        </div>
                        <canvas id="canvas" width="300" height="300"></canvas>
                    </div>
                    <div class="right-container">
                        <div id="info">
                            <h2>How to trigger "formStateRestoreCallback" (depends on the browser used)</h2>
                            <p>"Page navigation" means navigate page back and forward.</p>
                            <p>Safari: Page navigation. (Works incosistently and only for Scenario 1)</p>
                            <p>Firefox: Refresh page. (Works consitently and in all scenarios)</p>
                            <p>Chrome: In my local environment only "Scenario 2" triggers "formStateRestoreCallback" in Chrome on page navigation.</p>
                            <p>Make sure to perform each test in clean browser state.</p>
                        </div>
                        <div class="scenarios">
                            <h2>Scenario 1: Simple string</h2>
                            <p>Appending a string to a FormData object and calling setFormValue with said FormData object</p>
                            <button id="stringValue">elementInternals.setFormValue with string</button>
                            <p>Instructions: Press the button above, then trigger formStateRestoreCallback.</p>
                            <h3>Findings:</h3>
                            <p>- Both Firefox and Safari call formStateRestoreCallback and give back FormData object with correct value.</p>
                            <p>- Chrome not calling formStateRestoreCallback.</p>
                            <h2 id="scenario2">Scenario 2: Uploaded file</h2>
                            <p>Appending uploaded files to a FormData object and calling setFormValue with said FormData object</p>
                            <input type="file" id="fileUpload">
                            <p>Instructions: Select a file using the file input, then trigger formStateRestoreCallback</p>
                            <h3>Findings:</h3>
                            <p>- Firefox calls formStateRestoreCallback and returns file object in FormData object</p>
                            <p>- Safari not calling formStateRestoreCallback. (Safari shows message in console (when calling internals.setFormValue) that File objects are not supported in form state)</p>
                            <p>- Chrome calls formStateRestoreCallback (only on page navigation), and returns file object in FormData object</p>
                            <h2>Scenario 3: File object retrieved from canvas</h2>
                            <p>Appending a File object retrieved from canvas to a FormData object and calling setFormValue</p>
                            <button id="fileFromCanvas">elementInternals.setFormValue with file from canvas</button>
                            <p>Instructions: Press the button above, then trigger formStateRestoreCallback.</p>
                            <h3>Findings:</h3>
                            <p>- Only Firefox calls formStateRestoreCallback and returns file object in FormData object</p>
                            <p>- Chrome and Safari not calling formStateRestoreCallback. (Safari shows message in console (when calling internals.setFormValue) that File objects are not supported in form state)</p>
                            <p>- Chrome NEVER calls formStateRestoreCallback when using a File retrieved from a canvas (This was the originally reported bug)</p>
                        </div>
                    </div>
                </div>
            </main>
            `;

class FormStateComponent extends HTMLElement {

    static formAssociated = true;

    #canvas;
    #console;
    #fileUpload;
    #stringValue;
    #fileFromCanvas;
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
        this.#console = this.shadowRoot.querySelector('#console');
        this.#fileUpload = this.shadowRoot.querySelector('#fileUpload');
        this.#stringValue = this.shadowRoot.querySelector('#stringValue');
        this.#fileFromCanvas = this.shadowRoot.querySelector('#fileFromCanvas');

        this.#console.innerHTML = '';// clearing console, so it won't be filled when navigating back and forward
        this.drawImageOnCanvas();
        this.#addEventListeners();

    };

    #appendHtmlTemplate() {
        const template = document.createElement('template');
        template.innerHTML = formStateTemplate;
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    #addEventListeners() {
        // add event listeners
        this.#fileUpload.addEventListener('change', (e) => {
            let files = e.target.files;
            this.setFormValueUsingFileUpload(files);
        });

        this.#stringValue.addEventListener('click', () => {
            this.setFormValueUsingSimpleString();
        });

        this.#fileFromCanvas.addEventListener('click', () => {
            this.setFormValueUsingFileRetrievedFromCanvas();
        });
    }

    async getFileFromUrl(url, fileName) {
        let file;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const mimeType = response.headers.get('content-type');
            file = new File([blob], fileName, {type: mimeType});
        } catch (error) {
            console.warn(`getFileFromUrl: could not get file: ${error}`);
        }
        return file;
    }

    async canvasToFile(canvas) {
        return await this.getFileFromUrl(canvas.toDataURL('image/png', 1), 'testFile.png');
    }

    drawImageOnCanvas() {
        const canvas = this.#canvas;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
        };
        img.onerror = function() {
            console.log('could not load image')
        }
        img.src = 'testimage.jpeg';
    }

    formStateRestoreCallback(state, mode) {
        console.log('formStateRestoreCallback called. state:', state);
        this.#addObjectToSimulatedConsole('formStateRestoreCallback called with value', state);
    }

    formAssociatedCallback(form) {
        console.log('Associated with form', form);
    }

    setFormValueUsingFileUpload(files) {
        let formData = new FormData();
        for (let file of files) {
            formData.append('file', file);
        }

        try {
            this.#internals.setFormValue(formData);
        } catch(error) {
            console.log('error', error)
        }
        this.#addObjectToSimulatedConsole('this.#internals.setFormValue() called with value', formData);
    }

    setFormValueUsingSimpleString() {
        let formData = new FormData();
        formData.append('a_string', 'Just a simple string');

        try {
            this.#internals.setFormValue(formData);
        } catch(error) {
            console.log('error', error)
        }
        this.#addObjectToSimulatedConsole('this.#internals.setFormValue called with with value', formData);
    }

    async setFormValueUsingFileRetrievedFromCanvas() {

        let file = await this.canvasToFile(this.#canvas);
        
        let formData = new FormData();
        formData.append('file', file);
        formData.append('a_string', 'And a string');
        try {
            this.#internals.setFormValue(formData);
        } catch(error) {
            console.log('error', error)
        }
        this.#addObjectToSimulatedConsole('this.#internals.setFormValue called with value', formData);
    }

    #addObjectToSimulatedConsole(introText, formData) {
        let formDataAsObject = Object.fromEntries(formData);
        console.log(introText, 'formData', formData, 'formData as object:', formDataAsObject);
        let div = document.createElement('div');
        div.className = 'console__message';
        div.innerText = `${introText}: ${JSON.stringify(formDataAsObject)}`;
        this.#console.appendChild(div);
    }
}

customElements.define('form-state', FormStateComponent);
