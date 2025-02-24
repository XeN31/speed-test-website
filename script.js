document.addEventListener("DOMContentLoaded", () => {
  // DOM elemanları
  const homeSection = document.getElementById("homeSection");
  const testSection = document.getElementById("testSection");
  const resultSection = document.getElementById("resultSection");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const modeToggle = document.getElementById("modeToggle");

  const downloadSpeedElem = document.getElementById("downloadSpeed");
  const uploadSpeedElem = document.getElementById("uploadSpeed");
  const pingElem = document.getElementById("pingValue");
  const jitterElem = document.getElementById("jitterValue");
  const packetLossElem = document.getElementById("packetLossValue");

  const downloadBar = document.getElementById("downloadBar");
  const uploadBar = document.getElementById("uploadBar");

  const finalDownloadElem = document.getElementById("finalDownload");
  const finalUploadElem = document.getElementById("finalUpload");
  const finalPingElem = document.getElementById("finalPing");
  const finalJitterElem = document.getElementById("finalJitter");
  const finalPacketLossElem = document.getElementById("finalPacketLoss");
  const recommendationText = document.getElementById("recommendationText");

  const historyList = document.getElementById("historyList");
  const shareButtons = document.querySelectorAll(".share-btn");

  let speedChart;
  let results = {
    download: 0,
    upload: 0,
    ping: 0,
    jitter: 0,
    packetLoss: 0
  };

  // Dark/Light Mode toggle
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
  });

  // Testi başlat
  startButton.addEventListener("click", () => {
    showSection(testSection);
    runSpeedTest();
  });

  // Yeniden test başlat
  restartButton.addEventListener("click", () => {
    resetTest();
    showSection(homeSection);
  });

  // Sosyal paylaşım butonları
  shareButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const platform = btn.getAttribute("data-platform");
      const text = `Benim internet hızım: İndirme ${results.download.toFixed(2)} Mbps, Yükleme ${results.upload.toFixed(2)} Mbps, Ping ${results.ping.toFixed(2)} ms.`;
      const url = encodeURIComponent(window.location.href);
      const encodedText = encodeURIComponent(text);
      let shareUrl = "";
      if(platform === "facebook"){
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      } else if(platform === "twitter"){
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`;
      } else if(platform === "linkedin"){
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${encodedText}`;
      } else if(platform === "whatsapp"){
        shareUrl = `https://api.whatsapp.com/send?text=${encodedText} ${url}`;
      }
      window.open(shareUrl, "_blank");
    });
  });

  // Belirli bölümü göster (diğerlerini gizle)
  function showSection(section) {
    document.querySelectorAll(".screen").forEach(sec => sec.classList.remove("active"));
    section.classList.add("active");
  }

  // Test öncesi UI ve sonuçları sıfırla
  function resetTest() {
    results = { download: 0, upload: 0, ping: 0, jitter: 0, packetLoss: 0 };
    downloadSpeedElem.textContent = "-";
    uploadSpeedElem.textContent = "-";
    pingElem.textContent = "-";
    jitterElem.textContent = "-";
    packetLossElem.textContent = "-";
    downloadBar.style.width = "0%";
    uploadBar.style.width = "0%";
    if(speedChart) {
      speedChart.destroy();
      speedChart = null;
    }
  }

  // Test akışını sırasıyla çalıştır: İndirme -> Yükleme -> Ping
  async function runSpeedTest() {
    try {
      results.download = await testDownloadSpeed();
      updateDownloadUI(results.download);
      results.upload = await testUploadSpeed();
      updateUploadUI(results.upload);
      const pingResults = await testPing();
      results.ping = pingResults.avg;
      results.jitter = pingResults.jitter;
      results.packetLoss = pingResults.packetLoss;
      updatePingUI(results.ping, results.jitter, results.packetLoss);
      createChart(results.download, results.upload);
      saveTestHistory();
      displayHistory();
      setTimeout(showResults, 1000);
    } catch (error) {
      console.error("Test Hatası:", error);
    }
  }

  // İndirme Hızı Testi
  function testDownloadSpeed() {
    return new Promise((resolve, reject) => {
      const fileUrl = "https://speed.hetzner.de/10MB.bin"; // 10MB dosya
      const xhr = new XMLHttpRequest();
      let startTime, endTime;
      xhr.responseType = "blob";
      xhr.onloadstart = function() {
        startTime = new Date().getTime();
      };
      xhr.onprogress = function(event) {
        if(event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          downloadBar.style.width = percentComplete + "%";
          const currentTime = new Date().getTime();
          const duration = (currentTime - startTime) / 1000;
          const bitsLoaded = event.loaded * 8;
          const speedMbps = (bitsLoaded / duration) / (1024 * 1024);
          downloadSpeedElem.textContent = speedMbps.toFixed(2);
        }
      };
      xhr.onload = function() {
        if(xhr.status === 200) {
          endTime = new Date().getTime();
          const duration = (endTime - startTime) / 1000;
          const fileSize = xhr.response.size; // byte cinsinden
          const bitsLoaded = fileSize * 8;
          const speedMbps = (bitsLoaded / duration) / (1024 * 1024);
          resolve(speedMbps);
        } else {
          reject("İndirme testi başarısız.");
        }
      };
      xhr.onerror = function() {
        reject("İndirme testi hatası.");
      };
      xhr.open("GET", fileUrl + "?cache=" + Math.random(), true);
      xhr.send();
    });
  }

  // Yükleme Hızı Testi
  function testUploadSpeed() {
    return new Promise((resolve, reject) => {
      const url = "https://postman-echo.com/post";
      const sizeInBytes = 5 * 1024 * 1024; // 5MB
      const blobData = new Blob([new ArrayBuffer(sizeInBytes)], { type: "application/octet-stream" });
      const xhr = new XMLHttpRequest();
      let startTime, endTime;
      xhr.upload.onprogress = function(event) {
        if(event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          uploadBar.style.width = percentComplete + "%";
          const currentTime = new Date().getTime();
          const duration = (currentTime - startTime) / 1000;
          const bitsUploaded = event.loaded * 8;
          const speedMbps = (bitsUploaded / duration) / (1024 * 1024);
          uploadSpeedElem.textContent = speedMbps.toFixed(2);
        }
      };
      xhr.onload = function() {
        if(xhr.status === 200) {
          endTime = new Date().getTime();
          const duration = (endTime - startTime) / 1000;
          const bitsUploaded = sizeInBytes * 8;
          const speedMbps = (bitsUploaded / duration) / (1024 * 1024);
          resolve(speedMbps);
        } else {
          reject("Yükleme testi başarısız.");
        }
      };
      xhr.onerror = function() {
        reject("Yükleme testi hatası.");
      };
      xhr.open("POST", url + "?cache=" + Math.random(), true);
      startTime = new Date().getTime();
      xhr.send(blobData);
    });
  }

  // Ping, Jitter ve Paket Kaybı Testi (fetch ile)
  async function testPing() {
    const pingUrl = "https://postman-echo.com/get?cache=" + Math.random();
    const pingCount = 5;
    let pingTimes = [];
    let failCount = 0;
    for(let i = 0; i < pingCount; i++){
      try {
        const start = new Date().getTime();
        await fetch(pingUrl, { cache: "no-cache" });
        const end = new Date().getTime();
        const pingTime = end - start;
        pingTimes.push(pingTime);
      } catch (error) {
        failCount++;
      }
    }
    const avgPing = pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length;
    const jitter = pingTimes.reduce((a, b) => a + Math.abs(b - avgPing), 0) / pingTimes.length;
    const packetLoss = (failCount / pingCount) * 100;
    return { avg: avgPing, jitter: jitter, packetLoss: packetLoss };
  }

  // UI güncellemeleri
  function updateDownloadUI(speed) {
    downloadSpeedElem.textContent = speed.toFixed(2);
  }

  function updateUploadUI(speed) {
    uploadSpeedElem.textContent = speed.toFixed(2);
  }

  function updatePingUI(ping, jitter, packetLoss) {
    pingElem.textContent = ping.toFixed(2);
    jitterElem.textContent = jitter.toFixed(2);
    packetLossElem.textContent = packetLoss.toFixed(2);
  }

  // Chart.js ile grafik oluşturma
  function createChart(download, upload) {
    const ctx = document.getElementById("speedChart").getContext("2d");
    speedChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Download", "Upload"],
        datasets: [{
          label: "Mbps",
          data: [download.toFixed(2), upload.toFixed(2)],
          backgroundColor: ["#ff7e5f", "#feb47b"]
        }]
      },
      options: {
        animation: { duration: 500 },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Sonuç ekranı güncelleme, renk kodlaması ve öneri
  function showResults() {
    finalDownloadElem.textContent = results.download.toFixed(2) + " Mbps";
    finalUploadElem.textContent = results.upload.toFixed(2) + " Mbps";
    finalPingElem.textContent = results.ping.toFixed(2) + " ms";
    finalJitterElem.textContent = results.jitter.toFixed(2) + " ms";
    finalPacketLossElem.textContent = results.packetLoss.toFixed(2) + " %";

    finalDownloadElem.style.color = results.download >= 50 ? "green" : (results.download >= 20 ? "orange" : "red");
    finalUploadElem.style.color = results.upload >= 30 ? "green" : (results.upload >= 15 ? "orange" : "red");
    finalPingElem.style.color = results.ping <= 50 ? "green" : (results.ping <= 100 ? "orange" : "red");
    finalJitterElem.style.color = results.jitter <= 20 ? "green" : (results.jitter <= 40 ? "orange" : "red");
    finalPacketLossElem.style.color = results.packetLoss === 0 ? "green" : (results.packetLoss <= 5 ? "orange" : "red");

    if(results.download >= 50) {
      recommendationText.textContent = "Mükemmel hız! İnternet bağlantınız çok iyi.";
    } else if(results.download >= 20) {
      recommendationText.textContent = "Orta düzey hız. Daha iyi bir deneyim için bağlantınızı yükseltebilirsiniz.";
    } else {
      recommendationText.textContent = "Düşük hız. İnternet sağlayıcınızla iletişime geçin.";
    }
    showSection(resultSection);
  }

  // Test geçmişini localStorage'da sakla
  function saveTestHistory() {
    const testResult = {
      date: new Date().toLocaleString(),
      download: results.download.toFixed(2),
      upload: results.upload.toFixed(2),
      ping: results.ping.toFixed(2)
    };
    let history = JSON.parse(localStorage.getItem("speedTestHistory")) || [];
    history.push(testResult);
    localStorage.setItem("speedTestHistory", JSON.stringify(history));
  }

  // Test geçmişini göster
  function displayHistory() {
    let history = JSON.parse(localStorage.getItem("speedTestHistory")) || [];
    historyList.innerHTML = "";
    history.slice().reverse().forEach(item => {
      let li = document.createElement("li");
      li.textContent = `${item.date} - İndirme: ${item.download} Mbps, Yükleme: ${item.upload} Mbps, Ping: ${item.ping} ms`;
      historyList.appendChild(li);
    });
  }
});
