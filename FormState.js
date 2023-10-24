// I created this file to test a possible bug in Chromium based browsers
// codepen:

let style = `
    :host {
      display:block;
    }
    .main {
        display:flex;
        flex-direction:column;
        justify-content:center;
        align-items:center;
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
        justify-content:center;
        align-items:start;
    }
    .right-container {
        height:500px;
        overflow:hidden;
        overflow-y:auto;
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
    #how-to-trigger {
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
                        <div id="console" class="console"></div>
                        <canvas id="canvas" width="300" height="300"></canvas>
                    </div>
                    <div class="right-container">
                        <div id="how-to-trigger">
                            <p>When formStateRestore gets called depends on the browser used:</p>
                            <p>Safari: navigate page back and forward.</p>
                            <p>Firefox: refresh page.</p>
                            <p>Chrome: in this example only very rarely does Chrome trigger the "formStateRestoreCallback". In my project i'm working on Chrome does reliabely call the "formStateRestoreCallback", Idon't know why it doesn't on this locally run script.</p>
                            <p>!IMPORTANT: do a hard refresh between each test otherwise "formStateRestoreCallback" might get called with old value.</p>
                        </div>
                        <h2>Scenario with simple string</h2>
                        <p>Appending a string to a FormData object and calling setFormValue with said FormData object</p>
                        <button id="stringValue">elementInternals.setFormValue with string</button>
                        <p>Instructions: Press the button above, then <a href="#how-to-trigger">trigger formStateRestoreCallback</a>.</p>
                        <h3>Findings:</h3>
                        <p>- Both Firefox and Safari call formStateRestoreCallback and give back FormData object with correct value.</p>
                        <p>- Chrome not calling formStateRestoreCallback.</p>
                        <h2>Scenario with uploaded file</h2>
                        <p>Appending uploaded files to a FormData object and calling setFormValue with said FormData object</p>
                        <input type="file" id="fileUpload">
                        <p>Instructions: Select a file using the file input, then <a href="#how-to-trigger">trigger formStateRestoreCallback</a></p>
                        <h3>Findings:</h3>
                        <p>- Firefox calls formStateRestoreCallback and returns file object in FormData object</p>
                        <p>- Safari not calling formStateRestoreCallback. (Safari shows message in console (when calling internals.setFormValue) that File objects are not supported in form state)</p>
                        <p>- Chrome calls formStateRestoreCallback (only when navigating page back and forward), and returns file object in FormData object</p>
                        <h2>Scenario with File from canvas</h2>
                        <p>Appending a File object retrieved from canvas to a FormData object and calling setFormValue</p>
                        <button id="fileFromCanvas">elementInternals.setFormValue with file from canvas</button>
                        <p>Instructions: Press the button above, then <a href="#how-to-trigger">trigger formStateRestoreCallback</a>.
                        <h3>Findings:</h3>
                        <p>- Only Firefox calls formStateRestoreCallback and returns file object in FormData object</p>
                        <p>- Chrome and Safari not calling formStateRestoreCallback. (Safari shows message in console (when calling internals.setFormValue) that File objects are not supported in form state)</p>
                        <p>- Chrome NEVER calls formStateRestoreCallback when using a File retrieved from a canvas (This was the originally reported bug)</p>
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

        //this.#console.innerText = '';// clearing console so it won't be filled when navigating back and forward
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
        img.src = 'testImage.jpeg';
    }

    #formDataToObject(formData) {
        let formDataObject = {};
        console.log('formData', formData);

        let formDataArray = Array.from(formData);
        formDataArray.forEach((value, key) => {
            formDataObject[key] = value;
        });
        return formDataObject
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
            formData.append('fileValue', file);
        }

        this.#internals.setFormValue(formData, formData);

        this.#addObjectToSimulatedConsole('this.#internals.setFormValue() called with FormData object containing a File object retrieved from upload', formData);
    }

    setFormValueUsingSimpleString() {
        let formData = new FormData();
        formData.append('string', 'Just a simple string');

        this.#internals.setFormValue(formData, formData);

        this.#addObjectToSimulatedConsole('this.#internals.setFormValue() called with FormData object containing simple string', formData);
    }

    async setFormValueUsingFileRetrievedFromCanvas() {

        let file = await this.canvasToFile(this.#canvas);
        
        let formData = new FormData();
        formData.append('fileValue', file);
        formData.append('string', 'Just a simple string');

        this.#internals.setFormValue(formData, formData);

        this.#addObjectToSimulatedConsole('ElementInternals setFormValue called with value', formData);
    }

    #addObjectToSimulatedConsole(introText, formData) {
        let formDataAsObject = this.#formDataToObject(formData);
        console.log(introText, formDataAsObject);
        let div = document.createElement('div');
        div.className = 'console__message';
        div.innerText = `${introText}: ${JSON.stringify(formDataAsObject)}`;
        this.#console.appendChild(div);
    }
}

customElements.define('form-state', FormStateComponent);
