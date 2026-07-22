function showSecretModal(title,data){$('secretModalTitle').textContent=title;$('secretModalContent').textContent=data;$('secretModal').classList.remove('hidden');state.secretData=data}
function closeSecretModal(){$('secretModal').classList.add('hidden')}
function copySecret(){navigator.clipboard.writeText(state.secretData).then(()=>showToast('Copied!','success'))}
