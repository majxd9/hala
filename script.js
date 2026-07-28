/* =====================================================================
   دعوة تخرج فاخرة — العمارة × المحيط × الحياة البحرية
   ملف الحركة والتفاعل الرئيسي
   ---------------------------------------------------------------------
   هذا الملف لا يحتاج أي تعديل. كل بيانات الدعوة موجودة في config.js فقط.
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- أدوات مساعدة عامة ---------- */
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function throttleRaf(fn) {
    var ticking = false;
    return function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          fn();
          ticking = false;
        });
        ticking = true;
      }
    };
  }

  /* ---------- أسماء عربية ثابتة (بدل الاعتماد على إعدادات المتصفح الإقليمية،
     اللي بيّنت إنها ما بتشتغل نفس الشي عبر كل الأجهزة والمتصفحات) ---------- */
  var WEEKDAYS_AR = [
    "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
  ];
  var MONTHS_AR = [
    "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
    "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
  ];

  function formatArabicWeekday(date) {
    return WEEKDAYS_AR[date.getDay()];
  }
  function formatArabicDate(date) {
    return date.getDate() + " " + MONTHS_AR[date.getMonth()] + " " + date.getFullYear();
  }
  function formatArabicTime(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    var period = h < 12 ? "ص" : "م";
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":" + pad(m) + " " + period;
  }

  /* ---------- 0) تثبيت بداية الصفحة من الأعلى دايمًا ---------- */
  function pinScrollToTop() {
    // بعض المتصفحات تطبّق القفز لـ #hash بعد حدث load مباشرة، فنعيد التثبيت هون كطبقة حماية إضافية
    window.addEventListener("load", function () {
      if (window.scrollY > 0) window.scrollTo(0, 0);
    });
  }

  /* ---------- 1) تجهيز البيانات (config.js + حقول محسوبة تلقائياً) ---------- */
  function buildContent() {
    var base =
      typeof invitationData !== "undefined" && invitationData ? invitationData : {};
    var content = Object.assign({}, base);

    if (base.graduateName) {
      var trimmedName = String(base.graduateName).trim();
      content.graduateInitial = trimmedName.charAt(0) || "";
    }

    if (base.eventDate) {
      var eventDate = new Date(base.eventDate);
      if (!isNaN(eventDate.getTime())) {
        content.dayName = formatArabicWeekday(eventDate);
        content.formattedDate = formatArabicDate(eventDate);
        content.formattedTime = formatArabicTime(eventDate);
      } else {
        console.warn(
          '[دعوة التخرج] لم أستطع قراءة "eventDate" في config.js. ' +
            'تأكد من الصيغة: "YYYY-MM-DDTHH:MM:SS" — مثال: "2026-09-18T19:00:00"'
        );
      }
    }
    return content;
  }

  /* ---------- 2) ربط البيانات بالعناصر (data-bind / data-bind-href) ---------- */
  function applyDataBinding(content) {
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var key = el.dataset.bind;
      var value = content[key];
      if (value !== undefined && value !== null && value !== "") {
        el.textContent = value;
      }
    });

    document.querySelectorAll("[data-bind-href]").forEach(function (el) {
      var key = el.dataset.bindHref;
      var value = content[key];
      if (value) el.setAttribute("href", value);
    });

    if (content.graduateName) {
      document.title = "دعوة تخرج \u2014 " + content.graduateName;
    }
  }

  /* ---------- 2ب) لجنة الإشراف (مصفوفة اختيارية بـ config.js) ---------- */
  function renderCommittee() {
    var wrap = document.getElementById("committeeBlock");
    var list = document.getElementById("committeeList");
    if (!wrap || !list) return;
    var names =
      typeof invitationData !== "undefined" ? invitationData.supervisors : null;
    if (!names || !names.length) return; // ما في أسماء؟ القسم يضل مخفي بالكامل

    names.forEach(function (name) {
      var li = document.createElement("li");
      li.textContent = name;
      list.appendChild(li);
    });
    wrap.hidden = false;
  }

  /* ---------- 3) العد التنازلي ---------- */
  function initCountdown() {
    var daysEl = document.getElementById("cd-days");
    var hoursEl = document.getElementById("cd-hours");
    var minutesEl = document.getElementById("cd-minutes");
    var secondsEl = document.getElementById("cd-seconds");
    var unitsWrap = document.getElementById("countdown-units");
    var doneMsg = document.getElementById("countdown-done");

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;
    if (typeof invitationData === "undefined" || !invitationData.eventDate) return;

    var target = new Date(invitationData.eventDate);
    if (isNaN(target.getTime())) return; // تحذير القراءة صار مسبقاً في buildContent

    var timer; // مُعرَّف قبل أول استدعاء لتفادي أي خطأ لو كان التاريخ ماضياً من البداية

    function showExpired() {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      if (unitsWrap) unitsWrap.style.display = "none";
      if (doneMsg) doneMsg.hidden = false;
      clearInterval(timer);
    }

    function tick() {
      var totalMs = target.getTime() - Date.now();
      if (totalMs <= 0) {
        showExpired();
        return;
      }
      var seconds = Math.floor((totalMs / 1000) % 60);
      var minutes = Math.floor((totalMs / 1000 / 60) % 60);
      var hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
      var days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

      daysEl.textContent = pad(days);
      hoursEl.textContent = pad(hours);
      minutesEl.textContent = pad(minutes);
      secondsEl.textContent = pad(seconds);
    }

    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- 4) ظهور العناصر عند التمرير ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- 5) مقياس العمق + تعتيم الأعماق (body::before) ---------- */
  function initDepthGauge() {
    var sections = document.querySelectorAll(".section[data-depth]");
    var valueEl = document.querySelector(".depth-gauge__value");
    var labelEl = document.querySelector(".depth-gauge__label");
    if (!sections.length || !valueEl || !labelEl) return;
    if (!("IntersectionObserver" in window)) return;

    var maxDepth = 0;
    sections.forEach(function (s) {
      var d = parseFloat(s.dataset.depth) || 0;
      if (d > maxDepth) maxDepth = d;
    });
    if (maxDepth === 0) maxDepth = 1;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var depth = parseFloat(entry.target.dataset.depth) || 0;
          var label = entry.target.dataset.label || "";
          valueEl.textContent = depth.toFixed(1) + " m";
          labelEl.textContent = label;
          var vignette = Math.min(depth / maxDepth, 1) * 0.55;
          document.documentElement.style.setProperty(
            "--depth-opacity",
            vignette.toFixed(2)
          );
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach(function (s) {
      io.observe(s);
    });
  }

  /* ---------- 6) شريط تقدّم التمرير ---------- */
  function initScrollProgress() {
    var fill = document.querySelector(".scroll-progress__fill");
    if (!fill) return;

    function update() {
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop || 0;
      var height = doc.scrollHeight - doc.clientHeight;
      var progress = height > 0 ? Math.min(Math.max(scrollTop / height, 0), 1) : 0;
      fill.style.transform = "scaleX(" + progress + ")";
    }

    var onScroll = throttleRaf(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------- 7) تأثير Parallax خفيف على الرسومات الخطية ---------- */
  function initParallax(reduceMotion) {
    if (reduceMotion) return;
    var items = document.querySelectorAll("[data-parallax]");
    if (!items.length) return;

    function update() {
      var viewportCenter = window.innerHeight / 2;
      items.forEach(function (el) {
        var factor = parseFloat(el.dataset.parallax) || 0;
        var rect = el.getBoundingClientRect();
        var elCenter = rect.top + rect.height / 2;
        var offset = (viewportCenter - elCenter) * factor;
        offset = Math.max(-90, Math.min(90, offset));
        el.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      });
    }

    var onScroll = throttleRaf(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------- 8) زر "ابدأ الرحلة" (تمرير سلس لأي عنصر data-scroll-target) ---------- */
  function initScrollCTA(reduceMotion) {
    var buttons = document.querySelectorAll("[data-scroll-target]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.querySelector(btn.dataset.scrollTarget);
        if (!target) return;
        target.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  }

  /* ---------- 9) رسم تدريجي للخطوط المعمارية (Stroke Draw-in) ---------- */
  function initDrawIn(reduceMotion) {
    var items = document.querySelectorAll("[data-draw]");
    if (!items.length || reduceMotion) return; // بالحركة المخفّضة تبقى الرسومات ظاهرة طبيعياً وفوراً

    var prepared = [];
    items.forEach(function (el, i) {
      try {
        var length = el.getTotalLength();
        el.style.strokeDasharray = String(length);
        el.style.strokeDashoffset = String(length);
        el.style.transition =
          "stroke-dashoffset 1.6s var(--ease-premium) " + (i % 8) * 0.1 + "s";
        prepared.push(el);
      } catch (err) {
        /* شكل نادر لا يدعم getTotalLength — يظهر طبيعياً بدون رسم تدريجي، وهذا آمن تماماً */
      }
    });
    if (!prepared.length || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.strokeDashoffset = "0";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    prepared.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- 10) تمرير تلقائي وناعم بعد فتح البوابة ---------- */
  var autoScrollActive = false;
  var autoScrollRaf = null;
  var autoScrollLastTime = null;
  var autoScrollPxPerMs = 0;

  function stopAutoScroll() {
    autoScrollActive = false;
    if (autoScrollRaf) cancelAnimationFrame(autoScrollRaf);
  }

  function autoScrollStep(time) {
    if (!autoScrollActive) return;
    if (autoScrollLastTime === null) autoScrollLastTime = time;
    var dt = time - autoScrollLastTime;
    autoScrollLastTime = time;
    var doc = document.documentElement;
    var maxScroll = doc.scrollHeight - doc.clientHeight;
    if (window.scrollY >= maxScroll - 2) {
      stopAutoScroll();
      return;
    }
    window.scrollBy(0, autoScrollPxPerMs * dt);
    autoScrollRaf = requestAnimationFrame(autoScrollStep);
  }

  function startAutoScroll(reduceMotion) {
    if (reduceMotion || autoScrollActive) return;
    if (typeof invitationData !== "undefined" && invitationData.autoScroll === false) return;

    var doc = document.documentElement;
    var maxScroll = doc.scrollHeight - doc.clientHeight;
    var remaining = Math.max(maxScroll - window.scrollY, 0);
    if (remaining <= 0) return;

    var seconds =
      typeof invitationData !== "undefined" && invitationData.autoScrollSeconds
        ? invitationData.autoScrollSeconds
        : 38;
    autoScrollPxPerMs = remaining / (seconds * 1000);
    autoScrollActive = true;
    autoScrollLastTime = null;
    autoScrollRaf = requestAnimationFrame(autoScrollStep);

    // أي تفاعل حقيقي من الزائر (لمس/تمرير عجلة الفأرة/ضغطة/زر) يوقف التمرير التلقائي فورًا
    // ويرجّع له التحكم الكامل — ما منعمل resume، القرار يصير كامل إله.
    document.addEventListener("wheel", stopAutoScroll, { passive: true, once: true });
    document.addEventListener("touchstart", stopAutoScroll, { passive: true, once: true });
    document.addEventListener("pointerdown", stopAutoScroll, { passive: true, once: true });
    document.addEventListener("keydown", stopAutoScroll, { once: true });
  }

  /* ---------- 11) زر الموسيقى الخلفية (اختياري بالكامل) ---------- */
  function initSoundToggle() {
    var btn = document.getElementById("soundToggle");
    var audio = document.getElementById("bgAudio");
    if (!btn || !audio) return;

    var url = typeof invitationData !== "undefined" ? invitationData.musicUrl : "";
    if (!url) return; // ما في رابط موسيقى بـ config.js؟ الزر يضل مخفي تمامًا

    audio.src = url;
    btn.hidden = false;

    btn.addEventListener("click", function () {
      if (audio.paused) {
        audio.play().catch(function () {
          /* المتصفح رفض التشغيل أو الملف غير متاح؛ نتجاهل بهدوء دون كسر الموقع */
        });
      } else {
        audio.pause();
      }
    });

    audio.addEventListener("play", function () {
      btn.classList.add("sound-toggle--on");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-label", "إيقاف الموسيقى");
    });
    audio.addEventListener("pause", function () {
      btn.classList.remove("sound-toggle--on");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "تشغيل الموسيقى");
    });
  }

  function tryStartMusicOnEntrance() {
    var audio = document.getElementById("bgAudio");
    if (!audio || !audio.getAttribute("src")) return;
    audio.play().catch(function () {
      /* المتصفحات تمنع التشغيل التلقائي أحياناً حتى مع ضغطة زر؛ زر الصوت اليدوي يبقى شغالاً */
    });
  }

  /* ---------- 13) فيديوهات الخلفية (البوابة + الختام) ---------- */
  function initBackgroundVideos(reduceMotion) {
    var entranceVideo = document.getElementById("entranceVideo");
    if (entranceVideo && reduceMotion) {
      // مع تفضيل تقليل الحركة، نكتفي بإطار ثابت (poster) بدل التشغيل المستمر
      entranceVideo.pause();
      entranceVideo.removeAttribute("autoplay");
    }

    var closingVideo = document.getElementById("closingVideo");
    if (!closingVideo) return;
    var src = closingVideo.dataset.src;
    if (!src) return;

    if (reduceMotion) return; // تبقى الصورة الثابتة (poster) فقط، بدون تحميل الفيديو إطلاقًا

    if (!("IntersectionObserver" in window)) {
      // بدون دعم IntersectionObserver، نحمّل الفيديو مباشرة كحل احتياطي بسيط
      closingVideo.src = src;
      closingVideo.play().catch(function () {});
      return;
    }

    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            closingVideo.src = src;
            closingVideo.addEventListener(
              "loadeddata",
              function () {
                closingVideo.classList.add("is-loaded");
              },
              { once: true }
            );
            closingVideo.play().catch(function () {});
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "60% 0px 60% 0px" } // يبدأ التحميل قبل ما يوصل القسم فعليًا بشوي، لتفادي أي وميض
    );
    io.observe(closingVideo);
  }

  /* ---------- 14) بوابة الدخول (النافذة المستديرة) ---------- */
  function initEntrance(reduceMotion) {
    var entrance = document.getElementById("entrance");
    var btn = document.getElementById("entranceBtn");
    var hero = document.getElementById("hero");
    if (!entrance || !btn || !hero) return;

    var opened = false;
    function openEntrance() {
      if (opened) return;
      opened = true;
      entrance.classList.add("entrance--opening");
      tryStartMusicOnEntrance();
      // نأخّر بدء التمرير حتى ينتهي انطواء البوابة (0.35s تأخير + 0.8s حركة = 1.15s في style.css)
      // حتى لا يتعارض تمرير الصفحة مع تصغير ارتفاع البوابة في نفس اللحظة.
      window.setTimeout(
        function () {
          startAutoScroll(reduceMotion);
        },
        reduceMotion ? 0 : 1150
      );
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault(); // بدون هذا السطر، الرابط العادي href="#hero" يبقى يشتغل كحل احتياطي
      openEntrance();
    });

    // فتح تلقائي حتى لو الزائر ما لمس الزر أبدًا — عشان التجربة تبلش لحالها دايمًا، متل فيديو
    window.setTimeout(openEntrance, reduceMotion ? 300 : 4000);
  }

  /* ---------- التشغيل: كل وحدة معزولة بحيث لا يوقف خطأ في وحدة بقية الموقع ---------- */
  function safeRun(fn, label) {
    try {
      fn();
    } catch (err) {
      console.error("[دعوة التخرج] خطأ في: " + label, err);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    safeRun(pinScrollToTop, "تثبيت بداية الصفحة");

    var reduceMotion = false;
    try {
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (err) {
      reduceMotion = false;
    }

    var content;
    try {
      content = buildContent();
    } catch (err) {
      console.error("[دعوة التخرج] خطأ في تجهيز البيانات", err);
      content = typeof invitationData !== "undefined" ? invitationData : {};
    }

    safeRun(function () {
      applyDataBinding(content);
    }, "ربط البيانات بالصفحة");
    safeRun(renderCommittee, "لجنة الإشراف");
    safeRun(function () {
      initEntrance(reduceMotion);
    }, "بوابة الدخول");
    safeRun(function () {
      initBackgroundVideos(reduceMotion);
    }, "فيديوهات الخلفية");
    safeRun(initCountdown, "العد التنازلي");
    safeRun(initReveal, "ظهور العناصر عند التمرير");
    safeRun(function () {
      initDrawIn(reduceMotion);
    }, "الرسم التدريجي للخطوط");
    safeRun(initDepthGauge, "مقياس العمق");
    safeRun(initScrollProgress, "شريط التقدّم");
    safeRun(function () {
      initParallax(reduceMotion);
    }, "تأثير Parallax");
    safeRun(function () {
      initScrollCTA(reduceMotion);
    }, "زر ابدأ الرحلة");
    safeRun(initSoundToggle, "زر الموسيقى");
  });
})();
