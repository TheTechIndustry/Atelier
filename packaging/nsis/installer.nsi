!cd "..\.."
!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "Atelier Desktop Studio"
OutFile "target\release\Atelier-Setup-NSIS.exe"
InstallDir "$LOCALAPPDATA\Atelier"
RequestExecutionLevel user

!define MUI_ABORTWARNING
!define MUI_ICON "crates\ui\icons\icon.ico"
!define MUI_UNICON "crates\ui\icons\icon.ico"

!define MUI_WELCOMEPAGE_TITLE "Welcome to Atelier Desktop Studio Setup"
!define MUI_WELCOMEPAGE_TEXT "Atelier transforms your Windows 10 & 11 desktop with a standalone Custom Taskbar, Dynamic Island, live video & 2D scene wallpapers, audio-reactive visualizers, desktop widgets, Mica & Acrylic materials, and fluid window animations.$\r$\n$\r$\nClick Next to continue."
!insertmacro MUI_PAGE_WELCOME

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN "$INSTDIR\Atelier.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Atelier Desktop Studio"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  File "target\release\Atelier.exe"
  File /nonfatal "target\release\atelier-core.exe"

  WriteRegStr HKCU "Software\Atelier" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Atelier" "$INSTDIR\Atelier.exe"

  CreateShortcut "$DESKTOP\Atelier.lnk" "$INSTDIR\Atelier.exe" "" "$INSTDIR\Atelier.exe" 0
  CreateDirectory "$SMPROGRAMS\Atelier"
  CreateShortcut "$SMPROGRAMS\Atelier\Atelier.lnk" "$INSTDIR\Atelier.exe" "" "$INSTDIR\Atelier.exe" 0
  CreateShortcut "$SMPROGRAMS\Atelier\Uninstall Atelier.lnk" "$INSTDIR\uninstall.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier" "DisplayName" "Atelier Desktop Studio"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier" "DisplayIcon" "$INSTDIR\Atelier.exe,0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier" "DisplayVersion" "0.1.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier" "Publisher" "Atelier"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier" "InstallLocation" "$INSTDIR"
SectionEnd

Section "Uninstall"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Atelier"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier"
  DeleteRegKey HKCU "Software\Atelier"

  Delete "$DESKTOP\Atelier.lnk"
  Delete "$SMPROGRAMS\Atelier\Atelier.lnk"
  Delete "$SMPROGRAMS\Atelier\Uninstall Atelier.lnk"
  RMDir "$SMPROGRAMS\Atelier"

  Delete "$INSTDIR\Atelier.exe"
  Delete "$INSTDIR\atelier-core.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
