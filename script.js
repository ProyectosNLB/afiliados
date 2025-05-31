const html5QrCode = new Html5Qrcode("reader");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resultDiv = document.getElementById("result");
const dataDisplay = document.getElementById("dataDisplay");
const submitButton = document.getElementById("submitButton");
const loadingDiv = document.getElementById("loading");

let dniData = {};

const config = { 
    fps: 10,
    qrbox: { width: 350, height: 120 }
};

// Ajusta la validación a los índices correctos
function validarCampos(campos) {
    return (
        campos.length >= 10 &&
        campos[2].trim() !== "" &&
        campos[3].trim() !== "" &&
        campos[1].trim() !== "" &&
        campos[6].trim() !== ""
    );
}

function actualizarBotonEnviar(valido) {
    submitButton.disabled = !valido;
}

function mostrarCarga(mostrar) {
    loadingDiv.hidden = !mostrar;
}

function onScanSuccess(decodedText, decodedResult) {
    html5QrCode.stop().then(() => {
        startButton.disabled = false;
        stopButton.disabled = true;
        mostrarCarga(false);

        try {
            const campos = decodedText.split("@");
            if (validarCampos(campos)) {
                dniData = {
                    apellido: campos[2].trim(),
                    nombre: campos[3].trim(),
                    dni: campos[1].trim(),
                    nacionalidad: campos[4].trim(), // Si tu QR no trae nacionalidad puedes dejarlo ""
                    fechaNacimiento: campos[6].length === 8
                        ? `${campos[6].substring(6, 8)}/${campos[6].substring(4, 6)}/${campos[6].substring(0, 4)}`
                        : campos[6].trim()
                };

                document.getElementById("apellido").textContent = dniData.apellido;
                document.getElementById("nombre").textContent = dniData.nombre;
                document.getElementById("dni").textContent = dniData.dni;
                document.getElementById("nacionalidad").textContent = dniData.nacionalidad;
                document.getElementById("fecha").textContent = dniData.fechaNacimiento;

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
