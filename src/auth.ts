// Client-side authentication module

const AUTH_STORAGE_KEY = 'fl_copilot_auth_session';

export class AuthManager {
  private loginOverlay!: HTMLElement;
  private loginForm!: HTMLFormElement;
  private usernameInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private loginErrorMsg!: HTMLElement;
  private logoutBtn!: HTMLButtonElement;
  private onLoginSuccessCallback: () => void;

  constructor(onLoginSuccessCallback: () => void) {
    this.onLoginSuccessCallback = onLoginSuccessCallback;

    this.loginOverlay = document.getElementById('loginOverlay') as HTMLElement;
    this.loginForm = document.getElementById('loginForm') as HTMLFormElement;
    this.usernameInput = document.getElementById('loginUsername') as HTMLInputElement;
    this.passwordInput = document.getElementById('loginPassword') as HTMLInputElement;
    this.loginErrorMsg = document.getElementById('loginErrorMsg') as HTMLElement;
    this.logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;

    this.bindEvents();
  }

  public init(): void {
    const isAuthed = localStorage.getItem(AUTH_STORAGE_KEY) === 'true' || sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    if (isAuthed) {
      this.hideLogin(false);
      this.onLoginSuccessCallback();
    } else {
      this.showLogin();
    }
  }

  private bindEvents(): void {
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  }

  private handleLogin(): void {
    const user = (this.usernameInput.value || '').trim().toLowerCase();
    const pass = (this.passwordInput.value || '').trim();

    // Check credentials as per Notion handoff spec
    if (user === 'dannyduong' && pass === 'Hoangkim123') {
      const rememberCheckbox = document.getElementById('loginRemember') as HTMLInputElement;
      if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      }

      this.loginErrorMsg.style.display = 'none';
      this.hideLogin(true);
      this.onLoginSuccessCallback();
    } else {
      this.showError('Invalid username or password. Please check your credentials.');
    }
  }

  private showError(msg: string): void {
    if (!this.loginErrorMsg) return;
    this.loginErrorMsg.textContent = msg;
    this.loginErrorMsg.style.display = 'block';

    const card = this.loginOverlay.querySelector('.login-card') as HTMLElement;
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);
    }
  }

  public showLogin(): void {
    if (this.loginOverlay) {
      this.loginOverlay.style.display = 'flex';
      setTimeout(() => {
        this.loginOverlay.style.opacity = '1';
        this.loginOverlay.style.pointerEvents = 'auto';
        if (this.usernameInput) {
          this.usernameInput.focus();
        }
      }, 10);
    }
  }

  public hideLogin(animated: boolean = true): void {
    if (this.loginOverlay) {
      if (animated) {
        this.loginOverlay.style.opacity = '0';
        this.loginOverlay.style.pointerEvents = 'none';
        setTimeout(() => {
          this.loginOverlay.style.display = 'none';
        }, 300);
      } else {
        this.loginOverlay.style.display = 'none';
        this.loginOverlay.style.opacity = '0';
        this.loginOverlay.style.pointerEvents = 'none';
      }
    }
  }

  public logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    if (this.passwordInput) this.passwordInput.value = '';
    this.showLogin();
  }
}
