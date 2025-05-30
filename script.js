// script.js - Lector de DNI Argentino PDF417
// Mejoras: 
// - Usa el nodo real <video> en ZXing (no solo el id)
// - Inicializa el stream manualmente para asegurar video visible
// - Detiene correctamente el stream al finalizar
// - Selecciona cámara trasera/de mayor capacidad si está disponible
// - Mayor robustez y mensajes de error claros

const { ZXingBrowser } = window.ZXing;
const { BrowserMultiFormatReader, BarcodeFormat } = ZXing;

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resultDiv = document.getElementById("result");
const dataDisplay = document.getElementById("dataDisplay");
const submitButton = document.getElementById("submitButton");
const loadingDiv = document.getElementById("loading");
const video = document.getElementById("video");

let codeReader;
let currentStream;
let selectedDeviceId = null;
let scanning = false;
let dniData = {};

function mostrarCarga(mostrar) {
    loadingDiv.hidden = !mostrar;
}

function actualizarBotonEnviar(valido) {
    submitButton.disabled = !valido;
}

function validarCampos(campos) {
    return (
        campos.length >= 6 &&
        campos[0].trim() !== "" &&
        campos[1].trim() !== "" &&
        campos[3].trim() !== "" &&
        /^\d{8}$/.test(campos[5])
    );
}

function parsearPDF417(text) {
    // El PDF417 del DNI argentino es: Apellido@Nombre@Sexo@DNI@Nacionalidad@FechaNac@Ejemplar@FechaEmision@FechaVencimiento@Tramite
    const campos = text.split("@");
    if (!validarCampos(campos)) return null;
    return {
        apellido: campos[0]?.trim() || "",
        nombre: campos[1]?.trim() || "",
        dni: campos[3]?.trim() || "",
        fechaNacimiento: /^\d{8}$/.test(campos[5])
            ? `${campos[5].substring(0,4)}-${campos[5].substring(4,6)}-${campos[5].substring(6,8)}`
            : "Fecha inválida"
    };
}

// Selecciona la cámara trasera o la de mayor resolución
async function seleccionarMejorCamara(devices) {
    let backCams = devices.filter(d =>
        /back|trasera|rear|environment/i.test(d.label)
    );
    if (backCams.length > 0) {
        return backCams[0].deviceId;
    }
    // Busca la de mayor resolución si es posible (por label)
    let sorted = [...devices].sort((a, b) => {
        const getRes = label => {
            const match = label.match(/(\d{3,4})\D+(\d{3,4})/);
            return match ? parseInt(match[1], 10) * parseInt(match[2], 10) : 0;
        };
        return getRes(b.label) - getRes(a.label);
    });
    return sorted[0].deviceId;
}

// Inicializa manualmente el stream de la cámara y luego ZXing
async function iniciarEscaneo() {
    mostrarCarga(true);
    stopButton.disabled = false;
    startButton.disabled = true;
    resultDiv.textContent = "Escaneando...";
    dataDisplay.style.display = "none";
    actualizarBotonEnviar(false);

    codeReader = new BrowserMultiFormatReader();
    try {
        const devices = await codeReader.listVideoInputDevices();
        if (!devices || devices.length === 0) throw new Error("No se encontraron cámaras.");
        selectedDeviceId = await seleccionarMejorCamara(devices);

        // Primero: inicializa el stream manualmente (depuración y compatibilidad)
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } });
        video.srcObject = stream;
        await video.play();
        currentStream = stream;

        // Luego: ZXing usando el nodo real <video>
        codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            video, // nodo real, NO string id
            (result, err) => {
                if (result) {
                    scanning = false;
                    detenerEscaneo();
                    const campos = parsearPDF417(result.getText());
                    if (campos) {
                        dniData = campos;
                        document.getElementById("apellido").textContent = dniData.apellido;
                        document.getElementById("nombre").textContent = dniData.nombre;
                        document.getElementById("dni").textContent = dniData.dni;
                        document.getElementById("fecha").textContent = dniData.fechaNacimiento;
                        dataDisplay.style.display = "block";
                        actualizarBotonEnviar(true);
                        resultDiv.innerHTML = "<strong>DNI escaneado correctamente:</strong> Verifique los datos antes de enviar.";
                    } else {
                        resultDiv.innerHTML = "<strong>Error:</strong> El formato del código PDF417 no corresponde a un DNI argentino.";
                        dataDisplay.style.display = "none";
                        actualizarBotonEnviar(false);
                    }
                }
            },
            { formats: [BarcodeFormat.PDF_417] }
        );
        scanning = true;
        mostrarCarga(false);
    } catch (err) {
        mostrarCarga(false);
        resultDiv.textContent = "Error al iniciar la cámara: " + err;
        startButton.disabled = false;
        stopButton.disabled = true;
    }
}

function detenerEscaneo() {
    if (codeReader) codeReader.reset();
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    startButton.disabled = false;
    stopButton.disabled = true;
    mostrarCarga(false);
}

startButton.addEventListener("click", () => {
    iniciarEscaneo();
});

stopButton.addEventListener("click", () => {
    detenerEscaneo();
    resultDiv.textContent = "Escaneo detenido.";
});

submitButton.addEventListener("click", () => {
    if (dniData.apellido && dniData.nombre && dniData.dni && dniData.fechaNacimiento) {
        // Construir la URL del formulario con los datos
        const formUrl = "https://docs.google.com/forms/d/e/1nKrWnalh-FZ1J0pVYU_Ysp07k3zvkuR8ivAorhJwGGQ/viewform";
        const prefilledUrl = `${formUrl}?` +
            `entry.1070769273=${encodeURIComponent(dniData.apellido)}&` +
            `entry.1754481886=${encodeURIComponent(dniData.nombre)}&` +
            `entry.1546660382=${encodeURIComponent(dniData.dni)}&` +
            `entry.1113672182=${encodeURIComponent(dniData.fechaNacimiento)}`;

        window.location.href = prefilledUrl;
    } else {
        resultDiv.innerHTML = "<strong>Error:</strong> No hay datos válidos para enviar.";
    }
});

// Limpieza al salir
window.addEventListener("beforeunload", () => {
    if (codeReader) codeReader.reset();
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
});
