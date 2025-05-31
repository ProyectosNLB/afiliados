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

function mostrarCarga(mostrar, mensaje = "Cargando cámara...") {
    loadingDiv.innerHTML = `<span class="spinner"></span> ${mensaje}`;
    loadingDiv.style.display = mostrar ? "block" : "none";
}

function mostrarError(msg) {
    resultDiv.innerHTML = `<strong style="color:red;">${msg}</strong>`;
}

function limpiarDatos() {
    dataDisplay.style.display = "none";
    actualizarBotonEnviar(false);
    dniData = {};
}

function mostrarDatos(d) {
    document.getElementById("apellido").textContent = d.apellido || "-";
    document.getElementById("nombre").textContent = d.nombre || "-";
    document.getElementById("dni").textContent = d.dni || "-";
    document.getElementById("fecha").textContent = d.fechaNacimiento || "-";
    dataDisplay.style.display = "block";
    actualizarBotonEnviar(true);
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
    // Puedes mejorar este parser para adaptarlo a tu necesidad
    let dni = decodedText.match(/([0-9]{7,8})/);
    let fecha = decodedText.match(/([1-2][0-9]{7})/); // AAAAMMDD
    return {
        apellido: "",
        nombre: "",
        dni: dni ? dni[1] : "",
        fechaNacimiento: fecha ? `${fecha[1].substring(6,8)}/${fecha[1].substring(4,6)}/${fecha[1].substring(0,4)}` : ""
    }
}

function detenerEscaneo() {
    if (codeReader) {
        codeReader.reset();
        scanning = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        mostrarCarga(false);
        resultDiv.innerHTML = "";
    }
}

async function verificarPermisos() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarError("Este navegador no soporta acceso a la cámara.");
        mostrarCarga(false);
        startButton.disabled = false;
        stopButton.disabled = true;
        return false;
    }
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        return true;
    } catch (e) {
        mostrarError("No se pudo acceder a la cámara. Dale permisos desde la configuración del navegador.");
        mostrarCarga(false);
        startButton.disabled = false;
        stopButton.disabled = true;
        return false;
    }
}

startButton.addEventListener("click", async () => {
    limpiarDatos();
    resultDiv.textContent = "";
    startButton.disabled = true;
    stopButton.disabled = false;
    mostrarCarga(true, "Cargando cámara...");

    // Verifica soporte y permisos antes de continuar
    const tienePermiso = await verificarPermisos();
    if (!tienePermiso) return;

    if (!codeReader)
        codeReader = new BrowserMultiFormatReader();

    scanning = true;

    const constraints = {
        video: {
            facingMode: { ideal: "environment" }
        }
    };

    try {
        console.log("Antes de decodeFromConstraints");
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
                            mostrarError("El QR no corresponde a un DNI argentino válido.");
                            limpiarDatos();
                        }
                    } else if (result.barcodeFormat === BarcodeFormat.PDF_417) {
                        datos = parsearPDF417DNI(result.text);
                        if (datos.dni) {
                            dniData = datos;
                            mostrarDatos(datos);
                            resultDiv.innerHTML = "<strong>DNI (PDF417) escaneado correctamente:</strong> Verifique los datos antes de enviar.";
                        } else {
                            mostrarError("No se pudo leer un DNI válido en el código de barras.");
                            limpiarDatos();
                        }
                    } else {
                        mostrarError("Formato no soportado.");
                        limpiarDatos();
                    }
                }
                if (err && !(err instanceof NotFoundException)) {
                    mostrarError("Error: " + err);
                    console.error(err);
                }
            },
            {
                formats: [BarcodeFormat.QR_CODE, BarcodeFormat.PDF_417]
            }
        );
        console.log("Después de decodeFromConstraints");
        mostrarCarga(false);
    } catch (error) {
        mostrarCarga(false);
        startButton.disabled = false;
        stopButton.disabled = true;
        mostrarError(`Error al iniciar el escáner: ${error.message}`);
        console.error("Error al iniciar el escáner:", error);
    }
});

stopButton.addEventListener("click", () => {
    detenerEscaneo();
});

submitButton.addEventListener("click", () => {
    alert("Datos enviados:\n" + JSON.stringify(dniData, null, 2));
});
