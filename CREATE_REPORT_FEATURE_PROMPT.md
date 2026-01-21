# Детальный промпт: Функционал создания нового отчёта

## Обзор функционала

Пользователь может создать новый отчёт для анализа отзывов с Яндекс.Карт. Процесс запускается через **Floating Action Button (FAB)** на экране списка отчётов, который открывает **Bottom Sheet** с формой создания.

---

## Архитектура функционала

```
┌─────────────────────────────────────────────────────────────┐
│                    ReportsScreen                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │              Список отчётов (LazyColumn)              │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                                           ┌───────┐         │
│                                           │  ➕   │ ← FAB   │
│                                           └───────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ onClick
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CreateReportBottomSheet                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Форма создания отчёта                                │  │
│  │  • Название                                           │  │
│  │  • URL Яндекс.Карт                                    │  │
│  │  • Период (от - до)                                   │  │
│  │  • Кнопки: Отмена / Создать                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ onSubmit
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API: POST /api/reports                   │
│                                                             │
│  Request:                                                   │
│  {                                                          │
│    "title": "Анализ за январь 2025",                       │
│    "yandexUrl": "https://yandex.ru/maps/org/...",          │
│    "periodStart": "2025-01-01T00:00:00.000Z",              │
│    "periodEnd": "2025-01-31T23:59:59.999Z"                 │
│  }                                                          │
│                                                             │
│  Response: Report object                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ onSuccess
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  • Закрыть Bottom Sheet                                     │
│  • Показать Snackbar "Отчёт создан"                        │
│  • Обновить список отчётов                                  │
│  • (Опционально) Перейти к созданному отчёту               │
└─────────────────────────────────────────────────────────────┘
```

---

## Часть 1: Floating Action Button (FAB)

### Расположение и стиль

```
┌─────────────────────────────────────────┐
│  Отчёты                                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Карточка отчёта 1                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Карточка отчёта 2                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Карточка отчёта 3                   ││
│  └─────────────────────────────────────┘│
│                                         │
│                              ┌────────┐ │
│                              │   ➕   │ │  ← FAB
│                              └────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  🏠      📄      👤                     │
└─────────────────────────────────────────┘
```

### Спецификация FAB

| Параметр | Значение |
|----------|----------|
| Размер | 56dp (стандартный) |
| Форма | CircleShape |
| Цвет фона | Primary (#6366F1) |
| Цвет иконки | White |
| Иконка | Icons.Default.Add |
| Elevation | 6dp |
| Позиция | Правый нижний угол |
| Отступ от края | 16dp |
| Отступ от BottomNav | 16dp выше навигации |

### Код FAB

```kotlin
@Composable
fun ReportsScreen(
    viewModel: ReportsViewModel = koinViewModel(),
    onReportClick: (String) -> Unit
) {
    val state by viewModel.state.collectAsState()
    var showCreateSheet by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            CreateReportFAB(
                onClick = { showCreateSheet = true }
            )
        },
        floatingActionButtonPosition = FabPosition.End
    ) { paddingValues ->
        // Content...
    }

    // Bottom Sheet
    if (showCreateSheet) {
        CreateReportBottomSheet(
            onDismiss = { showCreateSheet = false },
            onSuccess = {
                showCreateSheet = false
                viewModel.loadReports()
            }
        )
    }
}

@Composable
fun CreateReportFAB(
    onClick: () -> Unit
) {
    FloatingActionButton(
        onClick = onClick,
        containerColor = Color(0xFF6366F1),
        contentColor = Color.White,
        elevation = FloatingActionButtonDefaults.elevation(
            defaultElevation = 6.dp,
            pressedElevation = 12.dp
        )
    ) {
        Icon(
            imageVector = Icons.Default.Add,
            contentDescription = "Создать отчёт",
            modifier = Modifier.size(24.dp)
        )
    }
}
```

### Анимация FAB (опционально)

```kotlin
@Composable
fun AnimatedCreateReportFAB(
    onClick: () -> Unit,
    isListScrolling: Boolean
) {
    val fabScale by animateFloatAsState(
        targetValue = if (isListScrolling) 0f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "fab_scale"
    )

    if (fabScale > 0f) {
        FloatingActionButton(
            onClick = onClick,
            modifier = Modifier.scale(fabScale),
            containerColor = Color(0xFF6366F1),
            contentColor = Color.White
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Создать отчёт"
            )
        }
    }
}
```

---

## Часть 2: Bottom Sheet форма создания

### Визуальная схема Bottom Sheet

```
┌─────────────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════════════════ │  ← Drag handle
│                                                             │
│                   Создать новый отчёт                       │  ← Заголовок (24sp, Bold)
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚠️ Заполните все поля                                   ││  ← Error (если есть)
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Название отчёта *                                          │  ← Label
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📝 Анализ за январь 2025                                ││  ← TextField
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  URL Яндекс.Карт *                                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔗 https://yandex.ru/maps/org/restaurant/123/reviews   ││
│  └─────────────────────────────────────────────────────────┘│
│  Вставьте ссылку на страницу отзывов организации           │  ← Helper text
│                                                             │
│  Период анализа *                                           │
│  ┌───────────────────────┐     ┌───────────────────────┐   │
│  │ 📅 01.01.2025         │  —  │ 📅 31.01.2025         │   │  ← Date pickers
│  └───────────────────────┘     └───────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                       Отмена                            ││  ← Outlined button
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   🚀 Создать отчёт                      ││  ← Primary button
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Safe area padding
└─────────────────────────────────────────────────────────────┘
```

### Состояния Bottom Sheet

```
┌─────────────────────────────────────────────────────────────┐
│                        СОСТОЯНИЯ                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. INITIAL (начальное)                                     │
│     • Все поля пустые                                       │
│     • Кнопка "Создать" disabled                            │
│     • Нет ошибок                                            │
│                                                             │
│  2. FILLING (заполнение)                                    │
│     • Пользователь вводит данные                           │
│     • Валидация в реальном времени                         │
│     • Кнопка активируется когда все поля валидны           │
│                                                             │
│  3. VALIDATING (валидация при submit)                       │
│     • Проверка всех полей                                   │
│     • Показ ошибок под невалидными полями                  │
│                                                             │
│  4. LOADING (отправка)                                      │
│     • Кнопка показывает CircularProgressIndicator          │
│     • Все поля disabled                                     │
│     • Нельзя закрыть sheet                                 │
│                                                             │
│  5. SUCCESS (успех)                                         │
│     • Sheet закрывается                                     │
│     • Показывается Snackbar                                │
│     • Список обновляется                                    │
│                                                             │
│  6. ERROR (ошибка)                                          │
│     • Показ ошибки вверху формы                            │
│     • Поля разблокированы                                   │
│     • Можно исправить и повторить                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Полный код Bottom Sheet

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateReportBottomSheet(
    onDismiss: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: CreateReportViewModel = koinViewModel()
) {
    val state by viewModel.state.collectAsState()
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = true
    )
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    // Блокируем закрытие во время загрузки
    val onDismissRequest: () -> Unit = {
        if (!state.isLoading) {
            onDismiss()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        dragHandle = {
            Surface(
                modifier = Modifier.padding(vertical = 12.dp),
                color = Color(0xFFE2E8F0),
                shape = RoundedCornerShape(2.dp)
            ) {
                Box(modifier = Modifier.size(width = 32.dp, height = 4.dp))
            }
        },
        tonalElevation = 0.dp
    ) {
        CreateReportContent(
            state = state,
            onTitleChange = viewModel::updateTitle,
            onUrlChange = viewModel::updateUrl,
            onStartDateChange = viewModel::updateStartDate,
            onEndDateChange = viewModel::updateEndDate,
            onSubmit = {
                focusManager.clearFocus()
                viewModel.createReport(onSuccess = onSuccess)
            },
            onCancel = onDismissRequest
        )
    }
}

@Composable
private fun CreateReportContent(
    state: CreateReportState,
    onTitleChange: (String) -> Unit,
    onUrlChange: (String) -> Unit,
    onStartDateChange: (LocalDate) -> Unit,
    onEndDateChange: (LocalDate) -> Unit,
    onSubmit: () -> Unit,
    onCancel: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(bottom = 24.dp)
            .navigationBarsPadding()
            .imePadding()
    ) {
        // ═══════════════════════════════════════════════════
        // ЗАГОЛОВОК
        // ═══════════════════════════════════════════════════
        Text(
            text = "Создать новый отчёт",
            style = TextStyle(
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E293B)
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            textAlign = TextAlign.Center
        )

        // ═══════════════════════════════════════════════════
        // СООБЩЕНИЕ ОБ ОШИБКЕ
        // ═══════════════════════════════════════════════════
        AnimatedVisibility(
            visible = state.error != null,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFEF4444).copy(alpha = 0.1f)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Outlined.ErrorOutline,
                        contentDescription = null,
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = state.error ?: "",
                        style = TextStyle(
                            fontSize = 14.sp,
                            color = Color(0xFFEF4444)
                        )
                    )
                }
            }
        }

        // ═══════════════════════════════════════════════════
        // ПОЛЕ: НАЗВАНИЕ ОТЧЁТА
        // ═══════════════════════════════════════════════════
        FormField(
            label = "Название отчёта",
            isRequired = true
        ) {
            OutlinedTextField(
                value = state.title,
                onValueChange = onTitleChange,
                placeholder = {
                    Text(
                        "Например: Анализ за январь 2025",
                        color = Color(0xFF94A3B8)
                    )
                },
                leadingIcon = {
                    Icon(
                        Icons.Outlined.Description,
                        contentDescription = null,
                        tint = Color(0xFF64748B)
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isLoading,
                singleLine = true,
                isError = state.titleError != null,
                supportingText = state.titleError?.let { error ->
                    { Text(error, color = Color(0xFFEF4444)) }
                },
                colors = createTextFieldColors(),
                shape = RoundedCornerShape(12.dp),
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Sentences,
                    imeAction = ImeAction.Next
                )
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // ═══════════════════════════════════════════════════
        // ПОЛЕ: URL ЯНДЕКС.КАРТ
        // ═══════════════════════════════════════════════════
        FormField(
            label = "URL Яндекс.Карт",
            isRequired = true,
            helperText = "Вставьте ссылку на страницу отзывов организации"
        ) {
            OutlinedTextField(
                value = state.yandexUrl,
                onValueChange = onUrlChange,
                placeholder = {
                    Text(
                        "https://yandex.ru/maps/org/.../reviews",
                        color = Color(0xFF94A3B8)
                    )
                },
                leadingIcon = {
                    Icon(
                        Icons.Outlined.Link,
                        contentDescription = null,
                        tint = Color(0xFF64748B)
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isLoading,
                singleLine = true,
                isError = state.urlError != null,
                supportingText = state.urlError?.let { error ->
                    { Text(error, color = Color(0xFFEF4444)) }
                },
                colors = createTextFieldColors(),
                shape = RoundedCornerShape(12.dp),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Uri,
                    imeAction = ImeAction.Done
                )
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // ═══════════════════════════════════════════════════
        // ПОЛЕ: ПЕРИОД АНАЛИЗА
        // ═══════════════════════════════════════════════════
        FormField(
            label = "Период анализа",
            isRequired = true
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                DatePickerField(
                    value = state.startDate,
                    onValueChange = onStartDateChange,
                    label = "От",
                    enabled = !state.isLoading,
                    modifier = Modifier.weight(1f)
                )

                Text(
                    text = "—",
                    style = TextStyle(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF64748B)
                    )
                )

                DatePickerField(
                    value = state.endDate,
                    onValueChange = onEndDateChange,
                    label = "До",
                    enabled = !state.isLoading,
                    modifier = Modifier.weight(1f)
                )
            }

            // Ошибка периода
            AnimatedVisibility(visible = state.periodError != null) {
                Text(
                    text = state.periodError ?: "",
                    style = TextStyle(
                        fontSize = 12.sp,
                        color = Color(0xFFEF4444)
                    ),
                    modifier = Modifier.padding(top = 4.dp, start = 16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // ═══════════════════════════════════════════════════
        // КНОПКИ
        // ═══════════════════════════════════════════════════

        // Кнопка "Отмена"
        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            enabled = !state.isLoading,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Color(0xFF64748B)
            ),
            border = BorderStroke(1.dp, Color(0xFFE2E8F0))
        ) {
            Text(
                text = "Отмена",
                style = TextStyle(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium
                )
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Кнопка "Создать отчёт"
        Button(
            onClick = onSubmit,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            enabled = state.isFormValid && !state.isLoading,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF6366F1),
                disabledContainerColor = Color(0xFF6366F1).copy(alpha = 0.5f)
            )
        ) {
            AnimatedContent(
                targetState = state.isLoading,
                transitionSpec = {
                    fadeIn() togetherWith fadeOut()
                },
                label = "button_content"
            ) { isLoading ->
                if (isLoading) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        Text(
                            text = "Создание...",
                            style = TextStyle(
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White
                            )
                        )
                    }
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Outlined.RocketLaunch,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "Создать отчёт",
                            style = TextStyle(
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ═══════════════════════════════════════════════════════════════

@Composable
private fun FormField(
    label: String,
    isRequired: Boolean = false,
    helperText: String? = null,
    content: @Composable () -> Unit
) {
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = label,
                style = TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1E293B)
                )
            )
            if (isRequired) {
                Text(
                    text = "*",
                    style = TextStyle(
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFEF4444)
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        content()

        if (helperText != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = helperText,
                style = TextStyle(
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                ),
                modifier = Modifier.padding(start = 4.dp)
            )
        }
    }
}

@Composable
private fun createTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Color(0xFF6366F1),
    unfocusedBorderColor = Color(0xFFE2E8F0),
    focusedLabelColor = Color(0xFF6366F1),
    cursorColor = Color(0xFF6366F1),
    errorBorderColor = Color(0xFFEF4444),
    disabledBorderColor = Color(0xFFE2E8F0).copy(alpha = 0.5f),
    disabledTextColor = Color(0xFF64748B).copy(alpha = 0.5f)
)
```

---

## Часть 3: Date Picker компонент

### Визуальная схема

```
┌─────────────────────────────────────────┐
│  📅  01.01.2025                    ▼   │  ← TextField (read-only)
└─────────────────────────────────────────┘
                    │
                    │ onClick
                    ▼
┌─────────────────────────────────────────┐
│                                         │
│           Выберите дату                 │
│                                         │
│  ◀  Январь 2025  ▶                     │
│                                         │
│  Пн  Вт  Ср  Чт  Пт  Сб  Вс           │
│                   1   2   3   4   5    │
│   6   7   8   9  10  11  12           │
│  13  14  15 [16] 17  18  19           │  ← Selected
│  20  21  22  23  24  25  26           │
│  27  28  29  30  31                    │
│                                         │
│           [Отмена]  [OK]               │
│                                         │
└─────────────────────────────────────────┘
```

### Код Date Picker

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DatePickerField(
    value: LocalDate,
    onValueChange: (LocalDate) -> Unit,
    label: String,
    enabled: Boolean = true,
    modifier: Modifier = Modifier
) {
    var showPicker by remember { mutableStateOf(false) }
    val dateFormatter = remember {
        DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale("ru"))
    }

    // TextField
    OutlinedTextField(
        value = value.format(dateFormatter),
        onValueChange = { },
        label = { Text(label) },
        modifier = modifier,
        readOnly = true,
        enabled = enabled,
        leadingIcon = {
            Icon(
                Icons.Outlined.CalendarToday,
                contentDescription = null,
                tint = if (enabled) Color(0xFF64748B) else Color(0xFF94A3B8),
                modifier = Modifier.size(20.dp)
            )
        },
        trailingIcon = {
            IconButton(
                onClick = { if (enabled) showPicker = true },
                enabled = enabled
            ) {
                Icon(
                    Icons.Default.ArrowDropDown,
                    contentDescription = "Выбрать дату",
                    tint = if (enabled) Color(0xFF64748B) else Color(0xFF94A3B8)
                )
            }
        },
        colors = createTextFieldColors(),
        shape = RoundedCornerShape(12.dp),
        interactionSource = remember { MutableInteractionSource() }
            .also { interactionSource ->
                LaunchedEffect(interactionSource) {
                    interactionSource.interactions.collect { interaction ->
                        if (interaction is PressInteraction.Release && enabled) {
                            showPicker = true
                        }
                    }
                }
            }
    )

    // Date Picker Dialog
    if (showPicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = value
                .atStartOfDay()
                .toInstant(ZoneOffset.UTC)
                .toEpochMilli()
        )

        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val newDate = Instant.ofEpochMilli(millis)
                                .atZone(ZoneOffset.UTC)
                                .toLocalDate()
                            onValueChange(newDate)
                        }
                        showPicker = false
                    }
                ) {
                    Text(
                        "OK",
                        color = Color(0xFF6366F1),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) {
                    Text(
                        "Отмена",
                        color = Color(0xFF64748B)
                    )
                }
            },
            colors = DatePickerDefaults.colors(
                containerColor = Color.White
            )
        ) {
            DatePicker(
                state = datePickerState,
                colors = DatePickerDefaults.colors(
                    selectedDayContainerColor = Color(0xFF6366F1),
                    todayDateBorderColor = Color(0xFF6366F1),
                    todayContentColor = Color(0xFF6366F1)
                )
            )
        }
    }
}
```

---

## Часть 4: ViewModel и State

### State класс

```kotlin
data class CreateReportState(
    // Поля формы
    val title: String = "",
    val yandexUrl: String = "",
    val startDate: LocalDate = LocalDate.now().minusMonths(1),
    val endDate: LocalDate = LocalDate.now(),

    // Ошибки валидации полей
    val titleError: String? = null,
    val urlError: String? = null,
    val periodError: String? = null,

    // Состояние загрузки
    val isLoading: Boolean = false,

    // Общая ошибка (от API)
    val error: String? = null
) {
    // Вычисляемое свойство: форма валидна?
    val isFormValid: Boolean
        get() = title.isNotBlank() &&
                yandexUrl.isNotBlank() &&
                isValidUrl(yandexUrl) &&
                startDate <= endDate &&
                titleError == null &&
                urlError == null &&
                periodError == null

    private fun isValidUrl(url: String): Boolean {
        return url.contains("yandex") &&
               url.contains("maps") &&
               (url.contains("/org/") || url.contains("/reviews"))
    }
}
```

### ViewModel

```kotlin
class CreateReportViewModel(
    private val reportRepository: ReportRepository
) : ViewModel() {

    private val _state = MutableStateFlow(CreateReportState())
    val state: StateFlow<CreateReportState> = _state.asStateFlow()

    // ═══════════════════════════════════════════════════════
    // ОБНОВЛЕНИЕ ПОЛЕЙ
    // ═══════════════════════════════════════════════════════

    fun updateTitle(title: String) {
        _state.update {
            it.copy(
                title = title,
                titleError = validateTitle(title),
                error = null
            )
        }
    }

    fun updateUrl(url: String) {
        _state.update {
            it.copy(
                yandexUrl = url,
                urlError = validateUrl(url),
                error = null
            )
        }
    }

    fun updateStartDate(date: LocalDate) {
        _state.update {
            it.copy(
                startDate = date,
                periodError = validatePeriod(date, it.endDate),
                error = null
            )
        }
    }

    fun updateEndDate(date: LocalDate) {
        _state.update {
            it.copy(
                endDate = date,
                periodError = validatePeriod(it.startDate, date),
                error = null
            )
        }
    }

    // ═══════════════════════════════════════════════════════
    // ВАЛИДАЦИЯ
    // ═══════════════════════════════════════════════════════

    private fun validateTitle(title: String): String? {
        return when {
            title.isBlank() -> "Введите название отчёта"
            title.length < 3 -> "Название слишком короткое"
            title.length > 100 -> "Название слишком длинное"
            else -> null
        }
    }

    private fun validateUrl(url: String): String? {
        return when {
            url.isBlank() -> "Введите URL"
            !url.startsWith("http") -> "URL должен начинаться с http:// или https://"
            !url.contains("yandex") -> "Введите ссылку на Яндекс.Карты"
            !url.contains("maps") -> "Введите ссылку на Яндекс.Карты"
            else -> null
        }
    }

    private fun validatePeriod(start: LocalDate, end: LocalDate): String? {
        return when {
            start > end -> "Дата начала не может быть позже даты окончания"
            end > LocalDate.now() -> "Дата окончания не может быть в будущем"
            start < LocalDate.now().minusYears(2) -> "Период слишком давний"
            else -> null
        }
    }

    private fun validateAll(): Boolean {
        val state = _state.value

        val titleError = validateTitle(state.title)
        val urlError = validateUrl(state.yandexUrl)
        val periodError = validatePeriod(state.startDate, state.endDate)

        _state.update {
            it.copy(
                titleError = titleError,
                urlError = urlError,
                periodError = periodError
            )
        }

        return titleError == null && urlError == null && periodError == null
    }

    // ═══════════════════════════════════════════════════════
    // СОЗДАНИЕ ОТЧЁТА
    // ═══════════════════════════════════════════════════════

    fun createReport(onSuccess: () -> Unit) {
        // Валидация перед отправкой
        if (!validateAll()) {
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            try {
                val request = CreateReportRequest(
                    title = _state.value.title.trim(),
                    yandexUrl = _state.value.yandexUrl.trim(),
                    periodStart = _state.value.startDate
                        .atStartOfDay()
                        .toInstant(ZoneOffset.UTC)
                        .toString(),
                    periodEnd = _state.value.endDate
                        .atTime(23, 59, 59)
                        .toInstant(ZoneOffset.UTC)
                        .toString()
                )

                val report = reportRepository.createReport(request)

                _state.update { it.copy(isLoading = false) }
                onSuccess()

            } catch (e: HttpException) {
                val errorMessage = when (e.code()) {
                    400 -> "Некорректные данные"
                    401 -> "Необходима авторизация"
                    403 -> "Доступ запрещён"
                    422 -> "Проверьте правильность URL"
                    500 -> "Ошибка сервера. Попробуйте позже"
                    else -> "Ошибка: ${e.message()}"
                }
                _state.update {
                    it.copy(isLoading = false, error = errorMessage)
                }

            } catch (e: IOException) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "Нет подключения к интернету"
                    )
                }

            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Неизвестная ошибка"
                    )
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // СБРОС ФОРМЫ
    // ═══════════════════════════════════════════════════════

    fun resetForm() {
        _state.value = CreateReportState()
    }
}
```

---

## Часть 5: API интеграция

### Retrofit Service

```kotlin
interface ApiService {

    @POST("api/reports")
    suspend fun createReport(
        @Body request: CreateReportRequest
    ): Response<Report>

    // ... другие методы
}
```

### Request/Response модели

```kotlin
// Request
data class CreateReportRequest(
    val title: String,
    val yandexUrl: String,
    val periodStart: String,  // ISO 8601 format
    val periodEnd: String     // ISO 8601 format
)

// Response — используется существующая модель Report
data class Report(
    val id: String,
    val userId: String,
    val title: String,
    val period: Period,
    val platform: String?,
    val status: String?,
    val stats: ReportStats,
    val summary: String?,
    val insights: List<String>,
    val recommendations: List<String>,
    val categoryStats: List<CategoryStats>?,
    val reviews: List<Review>?,
    val createdAt: String,
    val updatedAt: String
)
```

### Repository

```kotlin
interface ReportRepository {
    suspend fun getReports(): List<Report>
    suspend fun getReportById(id: String): Report
    suspend fun createReport(request: CreateReportRequest): Report
    suspend fun deleteReport(id: String)
}

class ReportRepositoryImpl(
    private val apiService: ApiService
) : ReportRepository {

    override suspend fun createReport(request: CreateReportRequest): Report {
        val response = apiService.createReport(request)

        if (response.isSuccessful) {
            return response.body()
                ?: throw Exception("Пустой ответ от сервера")
        } else {
            val errorBody = response.errorBody()?.string()
            throw HttpException(response)
        }
    }

    // ... другие методы
}
```

---

## Часть 6: Snackbar уведомления

### После успешного создания

```kotlin
@Composable
fun ReportsScreen(/* ... */) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showCreateSheet by remember { mutableStateOf(false) }

    Scaffold(
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = Color(0xFF10B981),
                    contentColor = Color.White,
                    shape = RoundedCornerShape(8.dp)
                )
            }
        },
        floatingActionButton = {
            CreateReportFAB(onClick = { showCreateSheet = true })
        }
    ) { /* ... */ }

    if (showCreateSheet) {
        CreateReportBottomSheet(
            onDismiss = { showCreateSheet = false },
            onSuccess = {
                showCreateSheet = false
                viewModel.loadReports()

                // Показываем Snackbar
                scope.launch {
                    snackbarHostState.showSnackbar(
                        message = "Отчёт успешно создан",
                        duration = SnackbarDuration.Short
                    )
                }
            }
        )
    }
}
```

---

## Часть 7: Полный flow создания отчёта

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Пользователь на экране "Отчёты"                            │
│     │                                                           │
│     ▼                                                           │
│  2. Нажимает FAB (+)                                           │
│     │                                                           │
│     ▼                                                           │
│  3. Открывается Bottom Sheet                                    │
│     │                                                           │
│     ▼                                                           │
│  4. Заполняет поля:                                            │
│     • Название отчёта                                          │
│     • URL Яндекс.Карт (копирует из браузера)                   │
│     • Выбирает период (date pickers)                           │
│     │                                                           │
│     ├─── Если ошибка валидации ───┐                            │
│     │                              │                            │
│     │                              ▼                            │
│     │                    Показываем ошибку                     │
│     │                    под полем                             │
│     │                              │                            │
│     │◀─────────────────────────────┘                            │
│     │                                                           │
│     ▼                                                           │
│  5. Нажимает "Создать отчёт"                                   │
│     │                                                           │
│     ▼                                                           │
│  6. Показывается loading (кнопка с spinner)                    │
│     │                                                           │
│     ├─── Если API error ──────────┐                            │
│     │                              │                            │
│     │                              ▼                            │
│     │                    Показываем ошибку                     │
│     │                    вверху формы                          │
│     │                              │                            │
│     │◀─────────────────────────────┘                            │
│     │                                                           │
│     ▼                                                           │
│  7. Успех!                                                      │
│     │                                                           │
│     ├─── Bottom Sheet закрывается                              │
│     ├─── Показывается Snackbar "Отчёт создан"                  │
│     ├─── Список отчётов обновляется                            │
│     └─── Новый отчёт появляется вверху списка                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Чеклист реализации

### UI компоненты:
- [ ] `CreateReportFAB` — кнопка создания
- [ ] `CreateReportBottomSheet` — модальное окно
- [ ] `CreateReportContent` — содержимое формы
- [ ] `FormField` — обёртка для полей с label
- [ ] `DatePickerField` — поле выбора даты

### Логика:
- [ ] `CreateReportState` — data class состояния
- [ ] `CreateReportViewModel` — ViewModel с валидацией
- [ ] Валидация названия (не пустое, 3-100 символов)
- [ ] Валидация URL (формат Яндекс.Карт)
- [ ] Валидация периода (start <= end, не в будущем)

### API:
- [ ] `CreateReportRequest` — модель запроса
- [ ] `ApiService.createReport()` — Retrofit метод
- [ ] `ReportRepository.createReport()` — Repository метод
- [ ] Обработка HTTP ошибок

### UX:
- [ ] Loading состояние на кнопке
- [ ] Блокировка полей при загрузке
- [ ] Показ ошибок валидации
- [ ] Показ ошибок API
- [ ] Snackbar при успехе
- [ ] Обновление списка после создания

### Дополнительно (опционально):
- [ ] Анимация появления/скрытия FAB при скролле
- [ ] Сохранение черновика в DataStore
- [ ] Предзаполнение URL из буфера обмена
- [ ] Переход к созданному отчёту после создания
