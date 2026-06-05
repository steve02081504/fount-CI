@echo off
powershell.exe -noprofile -executionpolicy bypass -file "%~dp0path\fount-CI.ps1" %*
