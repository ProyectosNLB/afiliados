// script.js - Lector de DNI Argentino Mejorado

// Referencias a elementos del DOM
const html5QrCode = new Html5Qrcode("reader");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resultDiv = document.getElementById("result");
const dataDisplay = document.getElementById("dataDisplay");
const submitButton = document.getElementById("submitButton");
const loadingDiv = document.getElementById("loading");

// Variables para almacenar los datos del DNI
let dniData = {};

// Configuración del escáner: área rectangular horizontal para el QR del DNI
const config = { 
    fps: 10,
    qrbox: { width: 350, height: 120 } // Área rectangular para facilitar el escaneo del QR del DNI
};

// Función para validar los campos del DNI (puedes ajustar la lógica según el formato real)
function validarCampos(campos) {
    return (
        campos.length >= 8 &&
        campos[1].trim() !== "" &&
        campos[2].trim() !== "" &&
        campos[3].trim() !== "" &&
        campos[7].trim() !== ""
    );
}

// Habilita o deshabilita el botón "Enviar" según los datos
function actualizarBotonEnviar(valido) {
    submitButton.disabled = !valido;
}

// Muestra u oculta el indicador de carga
function mostrarCarga(mostrar) {
    loadingDiv.hidden = !mostrar;
}

// Maneja el escaneo exitoso
function onScanSuccess(decodedText, decodedResult) {
    html5QrCode.stop().then(() => {
        startButton.disabled = false;
        stopButton.disabled = true;
        mostrarCarga(false);

        try {
            const campos = decodedText.split("@");
            if (validarCampos(campos)) {
                dniData = {
                    // Indices ajustados según el formato anterior que funcionaba
                    apellido: campos[1].trim(),
                    nombre: campos[2].trim(),
                    dni: campos[1].trim(),
                    fechaNacimiento: campos[7].length === 8
                        ? `${campos[7].substring(6, 8)}/${campos[7].substring(4, 6)}/${campos[7].substring(0, 4)}`
                        : campos[7].trim()
                };

                // Mostrar los datos en la tabla
                document.getElementById("apellido").textContent = dniData.apellido;
                document.getElementById("nombre").textContent = dniData.nombre;
                document.getElementById("dni").textContent = dniData.dni;
                document.getElementById("fecha").textContent = dniData.fechaNacimiento;

                // Mostrar la sección de datos y habilitar "Enviar"
                dataDisplay.style.display = "block";
                actualizarBotonEnviar(true);

                resultDiv.innerHTML = "<strong>DNI escaneado correctamente:</strong> Verifique los datos antes de enviar.";
            } else {
                resultDiv.innerHTML = "<strong>Error:</strong> El formato del QR no coincide con un DNI argentino.";
                dataDisplay.style.display = "none";
                actualizarBotonEnviar(false);
            }
        } catch (error) {
            console.error("Error al procesar el QR:", error);
            resultDiv.innerHTML = `<strong>Error al procesar el QR:</strong> ${error.message}`;
            dataDisplay.style.display = "none";
            actualizarBotonEnviar(false);
        }
    }).catch(error => {
        console.error("Error al detener el escáner tras escaneo:", error);
        resultDiv.innerHTML = `<strong>Error al detener el escáner:</strong> ${error.message}`;
    });
}

// Iniciar escaneo
startButton.addEventListener("click", () => {
    startButton.disabled = true;
    stopButton.disabled = false;
    mostrarCarga(true);
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess
    ).catch(error => {
        console.error("Error al iniciar el escáner:", error);
        resultDiv.innerHTML = `<strong>Error al iniciar el escáner:</strong> ${error.message}`;
        startButton.disabled = false;
        stopButton.disabled = true;
        mostrarCarga(false);
    });
});

// Detener escaneo
stopButton.addEventListener("click", () => {
    html5QrCode.stop().then(() => {
        startButton.disabled = false;
        stopButton.disabled = true;
        mostrarCarga(false);
    }).catch(error => {
        console.error("Error al detener el escáner:", error);
        resultDiv.innerHTML = `<strong>Error al detener el escáner:</strong> ${error.message}`;
    });
});
