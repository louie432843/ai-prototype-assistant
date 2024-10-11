let availableModels = [];

const defaultOptimizationPrompt = `
    Optimize the following product requirements for prototyping. Be specific and technical where needed, with clear details on functionality, layout, and features...
`;
const defaultGenerationPrompt = `
    Generate a functional HTML, CSS, and JavaScript prototype based on the following requirements...
`;
const defaultValidationPrompt = `
    Here is a generated prototype code based on the provided requirements. Review and make any necessary improvements to ensure it meets all requirements, has no bugs, and is fully functional.
    
    Return an updated version of the prototype code, with improvements as needed. Start with <!DOCTYPE html> and include only valid HTML, CSS, and JavaScript. Ensure any bugs are fixed, and that the requirements are fully met.
`;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('optimization-prompt').value = defaultOptimizationPrompt;
    document.getElementById('generation-prompt').value = defaultGenerationPrompt;
    document.getElementById('validation-prompt').value = defaultValidationPrompt;
 
});

async function fetchAvailableModels() {
    const modelHost = document.getElementById('model-host').value;
    const apiKey = document.getElementById('api-key').value;
    let url = '';
    let headers = {};

    if (modelHost === 'openai') {
        if (!apiKey) {
            alert("Please provide an OpenAI API key.");
            return;
        }
        url = 'https://api.openai.com/v1/models';
        headers = {
            'Authorization': `Bearer ${apiKey}`
        };
    } else if (modelHost === 'ollama') {
        url = 'http://localhost:11434/api/tags';
    }

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Failed to fetch models");
        const data = await response.json();
        availableModels = modelHost === 'openai' ? data.data.map(model => model.id) : data.models.map(model => model.name);
        populateModelDropdowns();
    } catch (error) {
        alert(`Error loading models: ${error.message}`);
    }
}

function populateModelDropdowns() {
    const optimizeModelDropdown = document.getElementById('optimize-model');
    const prototypeModelDropdown = document.getElementById('prototype-model');
    const validateModelDropdown = document.getElementById('validate-model');

    [optimizeModelDropdown, prototypeModelDropdown, validateModelDropdown].forEach(dropdown => dropdown.innerHTML = '');

    availableModels.forEach(model => {
        const option1 = document.createElement('option');
        const option2 = document.createElement('option');
        const option3 = document.createElement('option');

        option1.value = model;
        option1.text = model;
        option2.value = model;
        option2.text = model;
        option3.value = model;
        option3.text = model;

        optimizeModelDropdown.appendChild(option1);
        prototypeModelDropdown.appendChild(option2);
        validateModelDropdown.appendChild(option3);
    });
}

function getSelectedModel(step) {
    const model = document.getElementById(`${step}-model`).value;
    if (!model) {
        alert(`Please select a model for ${step}`);
        return null;
    }
    return model;
}

async function callApi(prompt, content, model) {
    const modelHost = document.getElementById('model-host').value;
    const apiKey = document.getElementById('api-key').value;
    let url = '';
    let body = {};
    let headers = {
        'Content-Type': 'application/json'
    };

    if (modelHost === 'openai') {
        if (!apiKey) {
            alert("Please provide an OpenAI API key.");
            return "";
        }
        url = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
            model: model,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: content }
            ],
            max_tokens: 4096,
            temperature: 0.5
        };
    } else if (modelHost === 'ollama') {
        url = `http://localhost:11434/api/chat`;
        body = {
            model: model,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: content }
            ],
        };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error("Failed to complete API call");
        const data = await response.json();
        return modelHost === 'openai' ? data.choices[0].message.content : data.generated_text;
    } catch (error) {
        alert(`API error: ${error.message}`);
        return "";
    }
}

async function optimizeRequirements() {
    const requirements = document.getElementById('requirements').value;
    const optimizeModel = getSelectedModel('optimize');
    if (!optimizeModel) return;
    const prompt = document.getElementById('optimization-prompt').value;
    const optimizedRequirements = await callApi(prompt, requirements, optimizeModel);
    document.getElementById('requirements').value = optimizedRequirements;
}

async function generatePrototype() {
    const requirements = document.getElementById('requirements').value;
    const projectName = document.getElementById('project-name').value.replace(/\s+/g, '_');
    const prototypeModel = getSelectedModel('prototype');
    if (!prototypeModel) return;
    const prompt = document.getElementById('generation-prompt').value;

    const prototypeCode = await callApi(prompt, requirements, prototypeModel);
    if (!prototypeCode) return;
    const filteredCode = prototypeCode.match(/<!DOCTYPE html[\s\S]*<\/html>/i);
    const htmlContent = filteredCode ? filteredCode[0] : '';

    const improvedPrototypeCode = await validateAndImprovePrototype(requirements, htmlContent);

    if (improvedPrototypeCode) {
        const blob = new Blob([improvedPrototypeCode], { type: 'text/html' });
        const fileName = `${projectName || 'improved_prototype'}.html`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.textContent = fileName;
        document.getElementById('output').appendChild(link);
        document.getElementById('output').appendChild(document.createElement('br'));
    }
}

async function validateAndImprovePrototype(requirements, prototypeCode) {
    const validateModel = getSelectedModel('validate');
    if (!validateModel) return "";
    const prompt = document.getElementById('validation-prompt').value;
    const validationContent = `
        Requirements: 
        ${requirements}
        PrototypeCode: 
        ${prototypeCode}
    `;

    const improvedCode = await callApi(prompt, validationContent, validateModel);
    document.getElementById('validation').innerText = "Prototype improved and ready for download.";

    const improvedHtmlContent = improvedCode.match(/<!DOCTYPE html[\s\S]*<\/html>/i);
    return improvedHtmlContent ? improvedHtmlContent[0] : '';
}
