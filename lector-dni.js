import { BrowserMultiFormatReader, BarcodeFormat, NotFoundException } from 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.4.1/esm/index.min.js';

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resultDiv = document.getElementById("result");
const dataDisplay = document.getElementById("dataDisplay");
const submitButton = document.getElementById("submitButton");
const loadingDiv = document.getElementById("loading");
const video = document.getElementById("video");

let codeReader = null;
let scanning = false;
let dniData = {};

function actualizarBotonEnviar(valido) {
    submitButton.disabled = !valido;
}

function mostrarCarga(mostrar) {
    loadingDiv.style.display = mostrar ? "block" : "none";
}

function validarCampos(campos) {
    return (
        campos.length >= 8 &&
        campos[1].trim() !== "" &&
        campos[2].trim() !== "" &&
        campos[3].trim() !== "" &&
        campos[4].trim() !== ""
    );
}

function parsearQRDNI(decodedText) {
    const campos = decodedText.split("@");
    if (!validarCampos(campos)) return null;
    return {
        apellido: campos[1].trim(),
        nombre: campos[2].trim(),
        dni: campos[4].trim(),
        fechaNacimiento: campos[7]?.length === 8
            ? `${campos[7].substring(6, 8)}/${campos[7].substring(4, 6)}/${campos[7].substring(0, 4)}`
            : campos[7]?.trim()
    };
}

function parsearPDF417DNI(decodedText) {
    let dni = decodedText.match(/([0-9]{7,8})/);
    let fecha = decodedText.match(/([1-2][0-9]{7})/); // AAAAMMDD
    return {
        apellido: "",
        nombre: "",
        dni: dni ? dni[1] : "",
        fechaNacimiento: fecha ? `${fecha[1].substring(6,8)}/${fecha[1].substring(4,6)}/${fecha[1].substring(0,4)}` : ""
    }
}

function mostrarDatos(dniData) {
    document.getElementById("apellido").textContent = dniData.apellido || "-";
    document.getElementById("nombre").textContent = dniData.nombre || "-";
    document.getElementById("dni").textContent = dniData.dni || "-";
    document.getElementById("fecha").textContent = dniData.fechaNacimiento || "-";
    dataDisplay.style.display = "block";
    actualizarBotonEnviar(true);
}

function limpiarDatos() {
    dataDisplay.style.display = "none";
    actualizarBotonEnviar(false);
}

function detenerEscaneo() {
    if (codeReader) {
        codeReader.reset();
        scanning = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        mostrarCarga(false);
    }
}

startButton.addEventListener("click", async () => {
    limpiarDatos();
    resultDiv.textContent = "";
    startButton.disabled = true;
    stopButton.disabled = false;
    mostrarCarga(true);

    if (!codeReader) {
        codeReader = new BrowserMultiFormatReader();
    }

    scanning = true;

    const constraints = {
        video: {
            facingMode: { ideal: "environment" }
        }
    };

    try {
        console.log("Antes de decodeFromConstraints"); // <- Mejora sugerida
        await codeReader.decodeFromConstraints(
            constraints,
            video,
            (result, err) => {
                if (result) {
                    detenerEscaneo();
                    mostrarCarga(false);
                    let datos = null;
                    if (result.barcodeFormat === BarcodeFormat.QR_CODE) {
                        datos = parsearQRDNI(result.text);
                        if (datos) {
                            dniData = datos;
                            mostrarDatos(datos);
                            resultDiv.innerHTML = "<strong>DNI (QR) escaneado correctamente:</strong> Verifique los datos antes de enviar.";
                        } else {
                            resultDiv.innerHTML = "<strong>Error:</strong> El QR no corresponde a un DNI argentino válido.";
                            limpiarDatos();
                        }
                    } else if (result.barcodeFormat === BarcodeFormat.PDF_417) {
                        datos = parsearPDF417DNI(result.text);
                        if (datos.dni) {
                            dniData = datos;
                            mostrarDatos(datos);
                            resultDiv.innerHTML = "<strong>DNI (PDF417) escaneado correctamente:</strong> Verifique los datos antes de enviar.";
                        } else {
                            resultDiv.innerHTML = "<strong>Error:</strong> No se pudo leer un DNI válido en el código de barras.";
                            limpiarDatos();
                        }
                    } else {
                        resultDiv.textContent = "Formato no soportado.";
                        limpiarDatos();
                    }
                }
                if (err && !(err instanceof NotFoundException)) {
                    resultDiv.textContent = "Error: " + err;
                }
            },
            {
                formats: [BarcodeFormat.QR_CODE, BarcodeFormat.PDF_417]
            }
        );
        console.log("Después de decodeFromConstraints"); // <- Mejora sugerida
        mostrarCarga(false);
    } catch (error) {
        mostrarCarga(false);
        startButton.disabled = false;
        stopButton.disabled = true;
        resultDiv.innerHTML = `<strong>Error al iniciar el escáner:</strong> ${error.message}`;
    }
});

stopButton.addEventListener("click", () => {
    detenerEscaneo();
});

submitButton.addEventListener("click", () => {
    alert("Datos enviados:\n" + JSON.stringify(dniData, null, 2));
});
