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

// Configuración del escáner
const config = { 
    fps: 10,
    qrbox: { width: 250, height: 250 }
};

// Función para validar los campos del DNI
function validarCampos(campos) {
    return (
        campos.length >= 5 &&
        campos[0].trim() !== "" &&
        campos[1].trim() !== "" &&
        campos[2].trim() !== "" &&
        campos[3].trim() !== "" &&
        /^\d{8}$/.test(campos[4])
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
                    apellido: campos[0].trim(),
                    nombre: campos[1].trim(),
                    dni: campos[2].trim(),
                    nacionalidad: campos[3].trim(),
                    fechaNacimiento: `${campos[4].substring(0, 4)}-${campos[4].substring(4, 6)}-${campos[4].substring(6, 8)}`
                };

                // Mostrar los datos en la tabla
                document.getElementById("apellido").textContent = dniData.apellido;
                document.getElementById("nombre").textContent = dniData.nombre;
                document.getElementById("dni").textContent = dniData.dni;
                document.getElementById("nacionalidad").textContent = dniData.nacionalidad;
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

// Maneja errores del escaneo (no se muestra al usuario para no ser intrusivo)
function onScanError(errorMessage) {
    // Puedes descomentar la siguiente línea para depurar:
    // console.warn("Escaneo fallido:", errorMessage);
}

// Iniciar escaneo
startButton.addEventListener("click", () => {
    mostrarCarga(true);
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            // Usar cámara trasera si existe
            const cameraId = devices.find(device => 
                device.label.toLowerCase().includes("back"))?.id || devices[0].id;

            html5QrCode.start(
                cameraId,
                config,
                onScanSuccess,
                onScanError
            ).then(() => {
                startButton.disabled = true;
                stopButton.disabled = false;
                dataDisplay.style.display = "none";
                actualizarBotonEnviar(false);
                resultDiv.textContent = "Escaneando...";
                mostrarCarga(false);
            }).catch(err => {
                mostrarCarga(false);
                resultDiv.innerHTML = "Error al iniciar el escáner: " + err;
            });
        } else {
            mostrarCarga(false);
            resultDiv.textContent = "No se encontraron cámaras disponibles.";
        }
    }).catch(err => {
        mostrarCarga(false);
        resultDiv.textContent = "Error al acceder a la cámara: " + err;
    });
});

// Detener escaneo
stopButton.addEventListener("click", () => {
    mostrarCarga(true);
    html5QrCode.stop().then(() => {
        startButton.disabled = false;
        stopButton.disabled = true;
        resultDiv.textContent = "Escaneo detenido.";
        mostrarCarga(false);
    }).catch(err => {
        mostrarCarga(false);
        resultDiv.textContent = "Error al detener el escáner: " + err;
    });
});

// Enviar datos al formulario de Google
submitButton.addEventListener("click", () => {
    if (dniData.apellido && dniData.nombre && dniData.dni && dniData.nacionalidad && dniData.fechaNacimiento) {
        // Construir la URL del formulario con los datos
        const formUrl = "https://docs.google.com/forms/d/e/1nKrWnalh-FZ1J0pVYU_Ysp07k3zvkuR8ivAorhJwGGQ/viewform";
        const prefilledUrl = `${formUrl}?` +
            `entry.1070769273=${encodeURIComponent(dniData.apellido)}&` +
            `entry.1754481886=${encodeURIComponent(dniData.nombre)}&` +
            `entry.1546660382=${encodeURIComponent(dniData.dni)}&` +
            `entry.835584076=${encodeURIComponent(dniData.nacionalidad)}&` +
            `entry.1113672182=${encodeURIComponent(dniData.fechaNacimiento)}`;

        window.location.href = prefilledUrl;
    } else {
        resultDiv.innerHTML = "<strong>Error:</strong> No hay datos válidos para enviar.";
    }
});
