import BaseComponent from "./BaseComponent.js";
import MatchMedia from "./MatchMedia.js";

const rootSelector = '[data-js-select]';

class Select extends BaseComponent {
    selectors = {
        root: rootSelector,
        originalControl: '[data-js-select-original-control]',
        button: '[data-js-select-button]',
        dropdown: '[data-js-select-dropdown]',
        option: '[data-js-select-option]',
    }

    stateClasses = {
        isExpanded: 'is-expanded',
        isSelected: 'is-selected',
        isCurrent: 'is-current',
        isOnTheLeftSide: 'is-on-the-left-side',
        isOnTheRightSide: 'is-on-the-right-side',
    }

    stateAttributes = {
        ariaExpanded: 'aria-expanded',
        ariaSelected: 'aria-selected',
        ariaActiveDescendant: 'aria-activedescendant',
    }

    initialState = {
        isExpanded: false,
        currentOptionIndex: null,
        selectedOptionElement: null
    }

    constructor(rootElement) {
        super();
        this.rootElement = rootElement;
        this.originalControlElement = this.rootElement.querySelector(this.selectors.originalControl);
        this.buttonElement = this.rootElement.querySelector(this.selectors.button);
        this.dropdownElement = this.rootElement.querySelector(this.selectors.dropdown);
        this.optionElements = this.dropdownElement.querySelectorAll(this.selectors.option);
        this.state = this.getProxyState({
            ...this.initialState,
            currentOptionIndex: this.originalControlElement.selectedIndex,
            selectedOptionElement: this.optionElements[this.originalControlElement.selectedIndex],
        });

        this.fixDropdownPosition();
        this.updateTabIndexes();
        this.bindEvents();
    }

    updateUI() {
        const {
            isExpanded,
            currentOptionIndex,
            selectedOptionElement
        } = this.state;

        const newSelectedOptionValue = selectedOptionElement.textContent.trim();

        const updateOriginalControl = () => {
            this.originalControlElement.value = newSelectedOptionValue;
        }

        const updateButton = () => {
            this.buttonElement.textContent = newSelectedOptionValue;
            this.buttonElement.classList.toggle(this.stateClasses.isExpanded, isExpanded);
            this.buttonElement.setAttribute(this.stateAttributes.ariaExpanded, isExpanded);
            this.buttonElement.setAttribute(
                this.stateAttributes.ariaActiveDescendant,
                this.optionElements[currentOptionIndex].id
            );

        }

        const updateDropdown = () => {
            this.dropdownElement.classList.toggle(this.stateClasses.isExpanded, isExpanded);
        }

        const updateOptions = () => {
            this.optionElements.forEach((optionElement, index) => {
                const isCurrent = currentOptionIndex === index;
                const isSelected = selectedOptionElement === optionElement;

                optionElement.classList.toggle(this.stateClasses.isCurrent, isCurrent);
                optionElement.classList.toggle(this.stateClasses.isSelected, isSelected);
                optionElement.setAttribute(this.stateAttributes.ariaSelected, isSelected);
            });
        }

        updateOriginalControl();
        updateButton();
        updateDropdown();
        updateOptions();
    }

    toggleExpandedState() {
        // Открывает/закрывает select
        this.state.isExpanded = !this.state.isExpanded;
    }

    expand() {
        // Открывает select
        this.state.isExpanded = true;
    }

    collapse() {
        // Закрывает select
        this.state.isExpanded = false;
    }

    fixDropdownPosition() {
        // Изменяем расположение dropdown в зависимости от расположения относительно центра экрана

        // Получаем ширину окна пользователя
        const viewportWidth = document.documentElement.clientWidth;
        const halfViewportX = viewportWidth / 2;

        // Обращаемся к кнопке и методом getBoundingClientRect получаем параметры размеров и координат
        const {width, x} = this.buttonElement.getBoundingClientRect();

        // Координата центра кнопки
        const buttonCenterX = x + width / 2;

        // Определяем находится ли кнопка в левой части viewport
        const isButtonOnTheLeftViewportSide = buttonCenterX < halfViewportX;

        this.dropdownElement.classList.toggle(
            this.stateClasses.isOnTheLeftSide,
            isButtonOnTheLeftViewportSide
        );

        this.dropdownElement.classList.toggle(
            this.stateClasses.isOnTheRightSide,
            !isButtonOnTheLeftViewportSide
        );
    }

    updateTabIndexes(isMobileDevise = MatchMedia.mobile.matches) {
        // метод изменяет атрибут TabIndex у select-ов в зависимости от ширины экрана

        this.originalControlElement.tabIndex = isMobileDevise ? 0 : -1;
        this.buttonElement.tabIndex = isMobileDevise ? -1 : 0;
    }

    get isNeedToExpand() {
        // Определяет нужно ли раскрывать dropdown

        const isButtonFocused = document.activeElement === this.buttonElement;

        return (!this.state.isExpanded && isButtonFocused);
    }

    selectCurrentOption() {
        this.state.selectedOptionElement = this.optionElements[this.state.currentOptionIndex];
    }

    onButtonClick = () => {
        this.toggleExpandedState();
    }

    onClick = (event) => {
        const {target} = event;
        const isOutsideDropdownClick =
            target.closest(this.selectors.dropdown) !== this.dropdownElement;
        const isButtonClick = target === this.buttonElement;

        // Закрывает select при клике вне select
        if (!isButtonClick && isOutsideDropdownClick) {
            this.collapse();
            return;
        }

        // Обработка клика по элементу option кастомного select
        const isOptionClick = target.matches(this.selectors.option);

        if (isOptionClick) {
            this.state.selectedOptionElement = target;
            this.state.currentOptionIndex = [...this.optionElements]
                .findIndex((optionElement) => optionElement === target);
            this.collapse();
        }
    }

    onArrowUpKeyDown = () => {
        if (this.isNeedToExpand) {
            this.expand();
            return;
        }

        if (this.state.currentOptionIndex > 0) {
            this.state.currentOptionIndex--;
        }
    }

    onArrowDownKeyDown = () => {
        if (this.isNeedToExpand) {
            this.expand();
            return;
        }

        if (this.state.currentOptionIndex < this.optionElements.length - 1) {
            this.state.currentOptionIndex++;
        }
    }

    onSpaceOrEnterKeyDown = () => {
        if (this.isNeedToExpand) {
            this.expand();
            return;
        }

        this.selectCurrentOption();
        this.collapse();
    }

    onKeyDown = (event) => {
        const { code } = event;

        // объект со свойствами, имена которых могут совпасть с тем, что приходит в code
        // из-за [code] в action лиюо храниться ссылка на метод обработки события нажатия кнопки, либо undefined
        const action = {
            ArrowUp: this.onArrowUpKeyDown,
            ArrowDown: this.onArrowDownKeyDown,
            Space: this.onSpaceOrEnterKeyDown,
            Enter: this.onSpaceOrEnterKeyDown,
        }[code]

        if (action) {
            event.preventDefault();
            action();
        }
    }

    onMobileMatchMediaChange = (event) => {
        this.updateTabIndexes(event.matches);
    }

    onOriginalControlChange = () => {
        this.state.selectedOptionElement = this.optionElements[this.originalControlElement.selectedIndex]
    }

    bindEvents() {
        // Отслеживаем изменение ширины экрана
        MatchMedia.mobile.addEventListener('change', this.onMobileMatchMediaChange);

        // Отслеживаем открытие/закрытие select
        this.buttonElement.addEventListener('click', this.onButtonClick);

        // Отслеживаем клик вне select
        document.addEventListener('click', this.onClick);

        // Отслеживаем нажатие кнопок клавиатуры
        this.rootElement.addEventListener('keydown', this.onKeyDown);

        // Добавление обратной синхронизации от оригинального к кастомному select
        this.originalControlElement.addEventListener('change', this.onOriginalControlChange)
    }
}

class SelectCollection {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll(rootSelector).forEach((element) => {
            new Select(element);
        });
    }
}

export default SelectCollection;